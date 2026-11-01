"""Contract tests for the stateless showcase entrypoint and service routing."""
import json
import subprocess
import sys
import unittest
from pathlib import Path
from vercel_app import application


class VercelShowcaseTests(unittest.TestCase):
    def call(self, path, method='GET'):
        result = {}
        def start(status, headers):
            result.update(code=int(status.split()[0]), headers=dict(headers))
        body = b''.join(application({'PATH_INFO': path, 'REQUEST_METHOD': method}, start))
        result['body'] = json.loads(body) if body else None
        return result

    def test_contact_and_health(self):
        contact = self.call('/api/contact')
        self.assertEqual(contact['code'], 200)
        self.assertIn('whatsapp', contact['body'])
        self.assertNotIn('password', contact['body'])
        self.assertEqual(self.call('/api/health')['body'], {'ok': True, 'mode': 'vitrine'})
        self.assertIsNone(self.call('/api/contact', 'HEAD')['body'])

    def test_no_false_acceptance_or_admin(self):
        for path, method in [('/api/requests', 'POST'), ('/api/admin/login', 'POST'), ('/api/admin/requests', 'GET')]:
            with self.subTest(path=path):
                self.assertEqual(self.call(path, method)['code'], 503)
        self.assertEqual(self.call('/server.py')['code'], 404)
        self.assertEqual(self.call('/api/contact', 'POST')['code'], 405)

    def test_does_not_import_sqlite_server(self):
        result = subprocess.run([sys.executable, '-c', "import sys; import vercel_app; assert 'server' not in sys.modules"],
                                cwd=Path(__file__).parent, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_service_routing_and_no_unusable_static_binding(self):
        config = json.loads((Path(__file__).parent / 'vercel.json').read_text(encoding='utf-8'))
        self.assertEqual(set(config['services']), {'app', 'frontend'})
        self.assertEqual(config['services']['app']['entrypoint'], 'vercel_app:application')
        self.assertEqual(config['services']['frontend']['buildCommand'], 'npm run build:vitrine')
        self.assertEqual(config['rewrites'][0], {'source': '/api/(.*)', 'destination': {'service': 'app'}})
        self.assertEqual(config['rewrites'][-1], {'source': '/(.*)', 'destination': {'service': 'frontend'}})
        self.assertFalse(any(service.get('bindings') for service in config['services'].values()))


if __name__ == '__main__':
    unittest.main()
