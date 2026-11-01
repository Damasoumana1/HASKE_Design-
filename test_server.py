"""Integration tests against the WSGI app, with an isolated temporary database."""
import base64
import io
import json
import os
import tempfile
import unittest
from unittest.mock import patch
from wsgiref.util import setup_testing_defaults

temp = tempfile.TemporaryDirectory()
os.environ['DATA_DIR'] = temp.name
os.environ['ADMIN_PASSWORD'] = 'test-only-password-long-enough'
os.environ['PUBLIC_URL'] = 'http://localhost:8000'
os.environ.pop('CONTACT_EMAIL', None)
os.environ.pop('SMTP_HOST', None)
import server


class ServerTests(unittest.TestCase):
    def setUp(self):
        with server.db() as conn:
            for table in ['attachments', 'requests', 'sessions', 'limits', 'outbox']:
                conn.execute('DELETE FROM ' + table)

    def call(self, path, method='GET', payload=None, cookie='', origin='http://localhost:8000', key=None):
        env = {}
        setup_testing_defaults(env)
        data = json.dumps(payload or {}).encode()
        env.update(PATH_INFO=path, REQUEST_METHOD=method, CONTENT_TYPE='application/json', CONTENT_LENGTH=str(len(data)), HTTP_ORIGIN=origin, HTTP_X_HASKE_REQUEST='1', HTTP_COOKIE=cookie, REMOTE_ADDR='test')
        env['wsgi.input'] = io.BytesIO(data)
        if key:
            env['HTTP_IDEMPOTENCY_KEY'] = key
        captured = {}
        def start(status, headers):
            captured.update(code=int(status.split()[0]), headers=dict(headers))
        body = b''.join(server.application(env, start))
        captured['body'] = json.loads(body) if 'application/json' in captured['headers'].get('Content-Type', '') else body
        return captured

    def payload(self):
        return {'service':'impression', 'details':{'support':'Flyer','quantity':'100','format':'A5','existing':'Visuel prêt à imprimer'}, 'client':'Client test', 'email':'client@example.com', 'description':'Des flyers pour mon projet.', 'consent':True, 'files':[{'name':'logo.png','data':base64.b64encode(b'\x89PNG\r\n\x1a\nexample').decode()}]}

    def login(self):
        result = self.call('/api/admin/login', 'POST', {'password':os.environ['ADMIN_PASSWORD']})
        self.assertEqual(result['code'], 200)
        self.assertIn('HttpOnly', result['headers']['Set-Cookie'])
        return result['headers']['Set-Cookie'].split(';')[0]

    def test_01_complete_lifecycle_and_persistence(self):
        key = 'integration-request-0001'
        result = self.call('/api/requests', 'POST', self.payload(), key=key)
        self.assertEqual(result['code'], 201)
        request_id = result['body']['id']
        repeat = self.call('/api/requests', 'POST', self.payload(), key=key)
        self.assertEqual(repeat['body']['id'], request_id)
        self.assertEqual(self.call('/api/admin/requests')['code'], 401)
        cookie = self.login()
        rows = self.call('/api/admin/requests', cookie=cookie)['body']['requests']
        self.assertEqual(len(rows), 1)
        file_id = rows[0]['files'][0]['id']
        self.assertEqual(self.call('/api/admin/files/' + file_id)['code'], 401)
        download = self.call('/api/admin/files/' + file_id, cookie=cookie)
        self.assertEqual(download['body'], b'\x89PNG\r\n\x1a\nexample')
        self.assertIn('attachment;', download['headers']['Content-Disposition'])
        update = self.call('/api/admin/requests/' + request_id, 'PATCH', {'status':'En discussion'}, cookie)
        self.assertEqual(update['code'], 200)
        with server.db() as conn:
            self.assertEqual(conn.execute('SELECT status FROM requests').fetchone()[0], 'En discussion')
            self.assertEqual(conn.execute('SELECT count(*) FROM outbox').fetchone()[0], 1)
        server.init_db()  # Restart initialization must preserve records.
        self.assertEqual(self.call('/api/admin/requests', cookie=cookie)['body']['requests'][0]['status'], 'En discussion')
        self.assertEqual(self.call('/api/admin/logout', 'POST', {}, cookie)['code'], 200)
        self.assertEqual(self.call('/api/admin/requests', cookie=cookie)['code'], 401)

    def test_02_validation_and_cross_origin(self):
        for field, value in [('consent',False), ('email','bad'), ('description',''), ('service','unknown'), ('details',{'quantity':'0'}), ('files',[{'name':'unsafe.html','data':'PGgxPg=='}])]:
            payload = self.payload(); payload[field] = value
            result = self.call('/api/requests', 'POST', payload, key='validation-test-' + field)
            self.assertEqual(result['code'], 400, (field, result))
        self.assertEqual(self.call('/api/admin/login', 'POST', {'password':os.environ['ADMIN_PASSWORD']}, origin='https://evil.example')['code'], 403)
        self.assertEqual(self.call('/api/admin/login', 'POST', {'password':'incorrect'})['code'], 401)

    def test_03_private_files_not_public(self):
        for path in ['/data/haske.sqlite3', '/server.py', '/.env', '/../server.py', '/assets/../server.py']:
            self.assertEqual(self.call(path)['code'], 404)
        for path in ['/', '/admin', '/confidentialite', '/dynamic.js', '/assets/logo.webp']:
            response = self.call(path)
            self.assertEqual(response['code'], 200)
            self.assertIn("frame-ancestors 'none'", response['headers']['Content-Security-Policy'])

    def test_04_rate_limit(self):
        for _ in range(12):
            response = self.call('/api/admin/login', 'POST', {'password':'wrong'})
        self.assertEqual(response['code'], 429)

    def test_05_email_retry_keeps_request(self):
        response = self.call('/api/requests', 'POST', self.payload(), key='email-retry-test-0001')
        self.assertEqual(response['code'], 201)
        with patch.dict(os.environ, {'SMTP_HOST':'smtp.example.com', 'SMTP_FROM':'atelier@example.com'}):
            with patch('server.smtplib.SMTP', side_effect=OSError('temporary failure')):
                server.notify_once()
            with server.db() as conn:
                message = conn.execute('SELECT * FROM outbox').fetchone()
                self.assertEqual(message['state'], 'pending')
                self.assertEqual(message['attempts'], 1)
                self.assertEqual(conn.execute('SELECT count(*) FROM requests').fetchone()[0], 1)
            with patch('server.smtplib.SMTP') as smtp:
                server.notify_once()
                smtp.return_value.__enter__.return_value.send_message.assert_called_once()
            with server.db() as conn:
                self.assertEqual(conn.execute('SELECT state FROM outbox').fetchone()[0], 'sent')

    def test_06_react_routes_and_safe_build_assets(self):
        with tempfile.TemporaryDirectory() as directory:
            build = server.Path(directory)
            (build / 'assets').mkdir()
            (build / 'index.html').write_text('<html><div id="root"></div></html>', encoding='utf-8')
            (build / 'assets' / 'index-test.js').write_text('console.log("HASKE")', encoding='utf-8')
            with patch.object(server, 'FRONTEND_DIST', build):
                for path in ['/', '/services', '/realisations', '/a-propos', '/contact', '/brief', '/admin', '/confidentialite', '/services/']:
                    response = self.call(path)
                    self.assertEqual(response['code'], 200, path)
                    self.assertIn(b'id="root"', response['body'])
                asset = self.call('/assets/index-test.js')
                self.assertEqual(asset['code'], 200)
                self.assertEqual(asset['headers']['Content-Type'], 'text/javascript')
                self.assertIn('immutable', asset['headers']['Cache-Control'])
                self.assertEqual(self.call('/assets/missing.js')['code'], 404)
                self.assertEqual(self.call('/assets/../server.py')['code'], 404)
                self.assertEqual(self.call('/page-inconnue')['code'], 404)
                self.assertEqual(self.call('/api/unknown')['code'], 404)
                self.assertEqual(self.call('/server.py')['code'], 404)

    def test_07_all_services_accept_complete_briefs(self):
        details = {
            'graphique': {'creation': 'Logo / identité visuelle', 'usage': 'Numérique', 'existing': 'Tout est à créer'},
            'impression': self.payload()['details'],
            'textile': {'support': 'T-shirt', 'quantity': '20', 'sizes': '10 M, 10 L', 'placement': 'Devant', 'supply': 'Je fournis les textiles', 'existing': 'Visuel disponible'},
            'objets': {'support': 'Tasse à café / mug', 'quantity': '12', 'placement': 'Une face', 'existing': 'Visuel disponible'},
            'toile': {'creation': 'Tableau personnalisé', 'quantity': '1', 'format': '40 x 60 cm', 'ambience': 'Abstrait'},
        }
        for service, fields in details.items():
            with self.subTest(service=service):
                payload = self.payload()
                payload.update(service=service, details=fields, files=[])
                response = self.call('/api/requests', 'POST', payload, key='all-services-test-' + service)
                self.assertEqual(response['code'], 201)


if __name__ == '__main__':
    unittest.main()
