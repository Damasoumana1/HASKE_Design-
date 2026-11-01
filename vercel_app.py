"""Stateless public API for the showcase. Never imports the SQLite server."""
import json
import os
from http import HTTPStatus
from public_contact import contact_details


def application(environ, start_response):
    method = environ.get('REQUEST_METHOD', 'GET')
    path = environ.get('PATH_INFO', '/')
    if path == '/api/requests' or path.startswith('/api/admin/'):
        code, payload = 503, {'error': 'Cette vitrine utilise WhatsApp. La gestion des demandes en ligne nécessite un stockage externe.'}
    elif method not in ('GET', 'HEAD'):
        code, payload = 405, {'error': 'Méthode non autorisée.'}
    elif path == '/api/contact':
        code, payload = 200, contact_details()
    elif path == '/api/health':
        code, payload = 200, {'ok': True, 'mode': 'vitrine'}
    else:
        code, payload = 404, {'error': 'Ressource introuvable.'}
    body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
    headers = [('Content-Type', 'application/json; charset=utf-8'),
               ('Content-Length', str(len(body))), ('Cache-Control', 'no-store'),
               ('X-Content-Type-Options', 'nosniff')]
    start_response(f'{code} {HTTPStatus(code).phrase}', headers)
    return [body if method != 'HEAD' else b'']


if __name__ == '__main__':
    from wsgiref.simple_server import make_server
    make_server('127.0.0.1', int(os.environ.get('PORT', '8000')), application).serve_forever()
