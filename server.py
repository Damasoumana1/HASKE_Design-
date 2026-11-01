"""HASKE Design: WSGI application, SQLite persistence and private attachments."""
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import smtplib
import sqlite3
import threading
import time
from datetime import datetime, timezone
from contextlib import contextmanager
from email.message import EmailMessage
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONTEND_DIST = ROOT / 'frontend' / 'dist'
SPA_ROUTES = {'/', '/index.html', '/services', '/realisations', '/a-propos', '/contact', '/brief', '/admin', '/confidentialite'}
DATA = Path(os.environ.get('DATA_DIR', ROOT / 'data')).resolve()
DATA.mkdir(parents=True, exist_ok=True)
PUBLIC_URL = os.environ.get('PUBLIC_URL', 'http://localhost:8000').rstrip('/')
PASSWORD = os.environ.get('ADMIN_PASSWORD', '')
STATUSES = ['Nouvelle', 'En discussion', 'Devis envoyé', 'Terminée', 'Archivée']
REQUIRED = {
    'graphique': ['creation', 'usage', 'existing'],
    'impression': ['support', 'quantity', 'format', 'existing'],
    'textile': ['support', 'quantity', 'sizes', 'placement', 'supply', 'existing'],
    'objets': ['support', 'quantity', 'placement', 'existing'],
    'toile': ['creation', 'quantity', 'format', 'ambience'],
}
EMAIL = re.compile(r'^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$')


@contextmanager
def db():
    conn = sqlite3.connect(DATA / 'haske.sqlite3', timeout=20)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys=ON')
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def init_db():
    with db() as conn:
        conn.executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS requests (
          id TEXT PRIMARY KEY, created TEXT NOT NULL, status TEXT NOT NULL,
          payload TEXT NOT NULL, idempotency TEXT NOT NULL UNIQUE);
        CREATE TABLE IF NOT EXISTS attachments (
          id TEXT PRIMARY KEY, request_id TEXT NOT NULL REFERENCES requests(id),
          name TEXT NOT NULL, mime TEXT NOT NULL, content BLOB NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires REAL NOT NULL);
        CREATE TABLE IF NOT EXISTS limits (bucket TEXT PRIMARY KEY, count INTEGER, expires REAL);
        CREATE TABLE IF NOT EXISTS outbox (
          id INTEGER PRIMARY KEY, recipient TEXT NOT NULL, subject TEXT NOT NULL,
          body TEXT NOT NULL, state TEXT NOT NULL DEFAULT 'pending', attempts INTEGER DEFAULT 0);
        ''')


class Problem(Exception):
    def __init__(self, code, message):
        self.code, self.message = code, message


def limited(bucket, maximum, seconds):
    with db() as conn:
        conn.execute('DELETE FROM limits WHERE expires < ?', (time.time(),))
        conn.execute('INSERT INTO limits VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1', (bucket, time.time() + seconds))
        count = conn.execute('SELECT count FROM limits WHERE bucket=?', (bucket,)).fetchone()[0]
    if count > maximum:
        raise Problem(429, 'Trop de tentatives. Réessayez plus tard.')


def session_token(env):
    from http.cookies import SimpleCookie
    cookie = SimpleCookie()
    try:
        cookie.load(env.get('HTTP_COOKIE', ''))
        token = cookie['haske_session'].value if 'haske_session' in cookie else ''
    except Exception:
        token = ''
    return hashlib.sha256(token.encode()).hexdigest()


def authenticated(env):
    with db() as conn:
        conn.execute('DELETE FROM sessions WHERE expires < ?', (time.time(),))
        found = conn.execute('SELECT token FROM sessions WHERE token=?', (session_token(env),)).fetchone()
    if not found:
        raise Problem(401, 'Connexion nécessaire.')


def read_json(env):
    try:
        length = int(env.get('CONTENT_LENGTH') or 0)
    except ValueError:
        raise Problem(400, 'Requête invalide.')
    if length > 15 * 1024 * 1024:
        raise Problem(413, 'La demande dépasse la taille autorisée.')
    if env.get('CONTENT_TYPE', '').split(';')[0] != 'application/json':
        raise Problem(415, 'Format JSON requis.')
    try:
        value = json.loads(env['wsgi.input'].read(length))
    except (ValueError, UnicodeDecodeError):
        raise Problem(400, 'JSON invalide.')
    if not isinstance(value, dict):
        raise Problem(400, 'Requête invalide.')
    return value


def validate(payload):
    service = payload.get('service')
    if not isinstance(service, str) or service not in REQUIRED:
        raise Problem(400, 'Prestation invalide.')
    details = payload.get('details')
    if not isinstance(details, dict) or len(details) > 20:
        raise Problem(400, 'Détails invalides.')
    if any(not isinstance(k, str) or not isinstance(v, str) or len(k) > 50 or len(v) > 350 for k, v in details.items()):
        raise Problem(400, 'Détails trop longs ou invalides.')
    if any(not details.get(key, '').strip() for key in REQUIRED[service]):
        raise Problem(400, 'Complétez les détails obligatoires de la prestation.')
    if 'quantity' in REQUIRED[service] and not re.fullmatch(r'[1-9][0-9]{0,6}', details['quantity']):
        raise Problem(400, 'Quantité invalide.')
    if 'quantity' in REQUIRED[service] and int(details['quantity']) > 1000000:
        raise Problem(400, 'Quantité trop élevée.')
    for key, maximum in {'description': 3000, 'client': 150, 'email': 254, 'phone': 100, 'references': 1500, 'deadline': 10, 'budget': 12}.items():
        value = payload.get(key, '')
        if not isinstance(value, str) or len(value) > maximum:
            raise Problem(400, 'Champ invalide : ' + key)
    if not payload.get('description', '').strip() or not payload.get('client', '').strip():
        raise Problem(400, 'Votre nom et votre description sont nécessaires.')
    if not EMAIL.fullmatch(payload.get('email', '')):
        raise Problem(400, 'Indiquez une adresse e-mail valide.')
    if payload.get('consent') is not True:
        raise Problem(400, 'Veuillez accepter le traitement de votre demande.')
    if payload.get('budget') and (not payload['budget'].isdigit() or int(payload['budget']) > 1000000000):
        raise Problem(400, 'Budget invalide.')
    if payload.get('deadline'):
        try:
            datetime.strptime(payload['deadline'], '%Y-%m-%d')
        except ValueError:
            raise Problem(400, 'Date invalide.')
    files = payload.get('files', [])
    if not isinstance(files, list) or len(files) > 3:
        raise Problem(400, 'Trois fichiers au maximum.')
    decoded = []
    for item in files:
        if not isinstance(item, dict) or not isinstance(item.get('name'), str) or not isinstance(item.get('data'), str):
            raise Problem(400, 'Fichier invalide.')
        name = item['name']
        if not name or len(name) > 150 or any(c in name for c in '\r\n/\\'):
            raise Problem(400, 'Nom de fichier invalide.')
        try:
            content = base64.b64decode(item['data'], validate=True)
        except ValueError:
            raise Problem(400, 'Fichier mal encodé.')
        suffix = Path(name).suffix.lower()
        valid = ((suffix == '.pdf' and content.startswith(b'%PDF-'), 'application/pdf'),
                 (suffix == '.png' and content.startswith(b'\x89PNG\r\n\x1a\n'), 'image/png'),
                 (suffix in ('.jpg', '.jpeg') and content.startswith(b'\xff\xd8\xff'), 'image/jpeg'),
                 (suffix == '.webp' and content[:4] == b'RIFF' and content[8:12] == b'WEBP', 'image/webp'))
        mime = next((mime for ok, mime in valid if ok), None)
        if not mime or not 0 < len(content) <= 3 * 1024 * 1024:
            raise Problem(400, 'Formats autorisés : PDF, PNG, JPEG, WebP ; 3 Mo par fichier.')
        decoded.append((name, mime, content))
    clean = {k: payload.get(k, '') for k in ['service', 'description', 'client', 'email', 'phone', 'references', 'deadline', 'budget']}
    clean['details'] = details
    clean['consent_at'] = datetime.now(timezone.utc).isoformat()
    return clean, decoded


def notify_once():
    """Durable outbox; an SMTP failure never discards an accepted brief."""
    host = os.environ.get('SMTP_HOST')
    if not host:
        return
    with db() as conn:
        rows = conn.execute("SELECT * FROM outbox WHERE state='pending' AND attempts<10 LIMIT 10").fetchall()
    for row in rows:
        try:
            message = EmailMessage()
            message['From'] = os.environ['SMTP_FROM']
            message['To'] = row['recipient']
            message['Subject'] = row['subject']
            message.set_content(row['body'])
            with smtplib.SMTP(host, int(os.environ.get('SMTP_PORT', '587')), timeout=15) as smtp:
                smtp.starttls()
                if os.environ.get('SMTP_USER'):
                    smtp.login(os.environ['SMTP_USER'], os.environ['SMTP_PASSWORD'])
                smtp.send_message(message)
            with db() as conn:
                conn.execute("UPDATE outbox SET state='sent', attempts=attempts+1 WHERE id=?", (row['id'],))
        except Exception:
            with db() as conn:
                conn.execute('UPDATE outbox SET attempts=attempts+1 WHERE id=?', (row['id'],))


def notification_worker():
    while True:
        try:
            notify_once()
        except Exception:
            pass
        time.sleep(60)


def route(env):
    path, method = env.get('PATH_INFO', '/'), env['REQUEST_METHOD']
    headers = []
    if method not in ('GET', 'POST', 'PATCH'):
        raise Problem(405, 'Méthode non autorisée.')
    if method != 'GET':
        if env.get('HTTP_ORIGIN') != PUBLIC_URL or env.get('HTTP_X_HASKE_REQUEST') != '1':
            raise Problem(403, 'Origine non autorisée.')
    if path == '/api/health' and method == 'GET':
        return 200, {'ok': True}, headers
    if path == '/api/contact' and method == 'GET':
        social_networks = [('Facebook', 'SOCIAL_FACEBOOK'), ('Instagram', 'SOCIAL_INSTAGRAM'), ('TikTok', 'SOCIAL_TIKTOK'), ('LinkedIn', 'SOCIAL_LINKEDIN'), ('YouTube', 'SOCIAL_YOUTUBE')]
        social_defaults = {'SOCIAL_FACEBOOK': 'https://www.facebook.com/', 'SOCIAL_TIKTOK': 'https://www.tiktok.com/', 'SOCIAL_LINKEDIN': 'https://www.linkedin.com/'}
        return 200, {
            'email': os.environ.get('CONTACT_EMAIL', ''),
            'phone': os.environ.get('CONTACT_PHONE') or '+226 74 03 35 29',
            'whatsapp': os.environ.get('CONTACT_WHATSAPP') or '22674033529',
            'location': os.environ.get('CONTACT_LOCATION') or 'Ouagadougou, Karpala',
            'mapsUrl': os.environ.get('CONTACT_MAPS_URL') or 'https://www.google.com/maps/search/?api=1&query=Karpala%2C%20Ouagadougou%2C%20Burkina%20Faso',
            'socials': [{'label': label, 'url': os.environ.get(key) or social_defaults.get(key)} for label, key in social_networks if os.environ.get(key) or social_defaults.get(key)],
        }, headers
    if path == '/api/requests' and method == 'POST':
        payload = read_json(env)
        if payload.get('website'):
            raise Problem(400, 'Demande invalide.')
        key = env.get('HTTP_IDEMPOTENCY_KEY', '')
        if not re.fullmatch(r'[a-zA-Z0-9-]{16,80}', key):
            raise Problem(400, 'Identifiant de tentative manquant.')
        with db() as conn:
            existing = conn.execute('SELECT id FROM requests WHERE idempotency=?', (key,)).fetchone()
        if existing:
            return 200, {'id': existing['id']}, headers
        limited('brief:' + env.get('REMOTE_ADDR', ''), 10, 3600)
        clean, files = validate(payload)
        request_id = 'HD-' + secrets.token_hex(6).upper()
        with db() as conn:
            try:
                conn.execute('INSERT INTO requests VALUES (?,?,?,?,?)', (request_id, clean['consent_at'], STATUSES[0], json.dumps(clean, ensure_ascii=False), key))
            except sqlite3.IntegrityError:
                existing = conn.execute('SELECT id FROM requests WHERE idempotency=?', (key,)).fetchone()
                return 200, {'id': existing['id']}, headers
            for name, mime, content in files:
                conn.execute('INSERT INTO attachments VALUES (?,?,?,?,?)', (secrets.token_hex(16), request_id, name, mime, content))
            conn.execute('INSERT INTO outbox(recipient,subject,body) VALUES (?,?,?)', (clean['email'], 'HASKE Design — demande ' + request_id, 'Votre demande a été reçue sous la référence ' + request_id + '.\nLa faisabilité, les tarifs et les délais seront confirmés après étude.'))
            if os.environ.get('CONTACT_EMAIL'):
                conn.execute('INSERT INTO outbox(recipient,subject,body) VALUES (?,?,?)', (os.environ['CONTACT_EMAIL'], 'Nouvelle demande ' + request_id, 'Une demande est disponible dans votre administration : ' + PUBLIC_URL + '/admin'))
        return 201, {'id': request_id}, headers
    if path == '/api/admin/login' and method == 'POST':
        limited('login:' + env.get('REMOTE_ADDR', ''), 10, 900)
        payload = read_json(env)
        supplied = payload.get('password', '')
        if len(PASSWORD) < 16:
            raise Problem(503, 'Administration non configurée.')
        if not isinstance(supplied, str) or not hmac.compare_digest(supplied.encode(), PASSWORD.encode()):
            raise Problem(401, 'Identifiants incorrects.')
        token = secrets.token_urlsafe(32)
        with db() as conn:
            conn.execute('INSERT INTO sessions VALUES (?,?)', (hashlib.sha256(token.encode()).hexdigest(), time.time() + 28800))
        secure = '; Secure' if PUBLIC_URL.startswith('https://') else ''
        headers.append(('Set-Cookie', 'haske_session=' + token + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800' + secure))
        return 200, {'ok': True}, headers
    if path.startswith('/api/admin/'):
        authenticated(env)
        if path == '/api/admin/logout' and method == 'POST':
            with db() as conn:
                conn.execute('DELETE FROM sessions WHERE token=?', (session_token(env),))
            return 200, {'ok': True}, [('Set-Cookie', 'haske_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')]
        if path == '/api/admin/requests' and method == 'GET':
            from urllib.parse import parse_qs
            try:
                page = max(0, int(parse_qs(env.get('QUERY_STRING', '')).get('page', ['0'])[0]))
            except ValueError:
                raise Problem(400, 'Page invalide.')
            with db() as conn:
                rows = conn.execute('SELECT * FROM requests ORDER BY created DESC LIMIT 20 OFFSET ?', (page * 20,)).fetchall()
                result = []
                for row in rows:
                    item = dict(row)
                    item.pop('idempotency')
                    item['payload'] = json.loads(item['payload'])
                    item['files'] = [dict(f) for f in conn.execute('SELECT id,name FROM attachments WHERE request_id=?', (row['id'],))]
                    result.append(item)
                pending = conn.execute("SELECT count(*) FROM outbox WHERE state='pending'").fetchone()[0]
            return 200, {'requests': result, 'statuses': STATUSES, 'pendingEmails': pending, 'smtpConfigured': bool(os.environ.get('SMTP_HOST'))}, headers
        if path.startswith('/api/admin/requests/') and method == 'PATCH':
            status = read_json(env).get('status')
            if status not in STATUSES:
                raise Problem(400, 'Statut invalide.')
            with db() as conn:
                updated = conn.execute('UPDATE requests SET status=? WHERE id=?', (status, path.rsplit('/', 1)[-1]))
                if not updated.rowcount:
                    raise Problem(404, 'Demande introuvable.')
            return 200, {'ok': True}, headers
        if path.startswith('/api/admin/files/') and method == 'GET':
            with db() as conn:
                row = conn.execute('SELECT * FROM attachments WHERE id=?', (path.rsplit('/', 1)[-1],)).fetchone()
            if not row:
                raise Problem(404, 'Fichier introuvable.')
            from urllib.parse import quote
            return 200, row['content'], [('Content-Type', 'application/octet-stream'), ('Content-Disposition', "attachment; filename*=UTF-8''" + quote(row['name'], safe=''))]
    if path.startswith('/api/'):
        raise Problem(404, 'Ressource introuvable.')
    if method != 'GET':
        raise Problem(405, 'Méthode non autorisée.')
    # Only built, explicitly public files can be served; never expose source/data.
    normalized_path = path.rstrip('/') or '/'
    if (FRONTEND_DIST / 'index.html').is_file():
        if normalized_path in SPA_ROUTES:
            return 200, (FRONTEND_DIST / 'index.html').read_bytes(), [('Content-Type', 'text/html; charset=utf-8')]
        if path.startswith('/assets/'):
            if not re.fullmatch(r'/assets/[a-zA-Z0-9_./-]+', path) or '..' in path.split('/'):
                raise Problem(404, 'Ressource introuvable.')
            asset_root = (FRONTEND_DIST / 'assets').resolve()
            asset = (FRONTEND_DIST / path[1:]).resolve()
            if asset.is_relative_to(asset_root) and asset.is_file() and asset.suffix in {'.js', '.css', '.webp', '.png', '.jpg', '.jpeg', '.svg', '.woff2', '.woff', '.ico'}:
                import mimetypes
                mime = {'.js': 'text/javascript', '.css': 'text/css'}.get(asset.suffix) or mimetypes.guess_type(asset.name)[0] or 'application/octet-stream'
                return 200, asset.read_bytes(), [('Content-Type', mime), ('Cache-Control', 'public, max-age=31536000, immutable')]
            # Brand images live outside the build and retain their original URLs.
            if not re.fullmatch(r'/assets/[a-zA-Z0-9_-]+\.webp', path):
                raise Problem(404, 'Ressource introuvable.')
        elif re.fullmatch(r'/[a-zA-Z0-9-]+/?', path):
            return 404, (FRONTEND_DIST / 'index.html').read_bytes(), [('Content-Type', 'text/html; charset=utf-8')]
    public = {'/': 'index.html', '/index.html': 'index.html', '/style.css': 'style.css', '/app.js': 'app.js', '/admin': 'admin.html', '/admin.js': 'admin.js', '/dynamic.js': 'dynamic.js', '/dynamic.css': 'dynamic.css', '/confidentialite': 'confidentialite.html'}
    if path in public:
        file = ROOT / public[path]
    elif re.fullmatch(r'/assets/[a-zA-Z0-9_-]+\.webp', path):
        file = ROOT / path[1:]
    else:
        raise Problem(404, 'Page introuvable.')
    if not file.is_file():
        raise Problem(404, 'Page introuvable.')
    import mimetypes
    return 200, file.read_bytes(), [('Content-Type', mimetypes.guess_type(file.name)[0] or 'application/octet-stream')]


def application(env, start_response):
    try:
        code, body, headers = route(env)
    except Problem as exc:
        code, body, headers = exc.code, {'error': exc.message}, []
    except Exception:
        import logging
        logging.exception('Erreur serveur HASKE')
        code, body, headers = 500, {'error': 'Erreur interne. Réessayez plus tard.'}, []
    if not isinstance(body, bytes):
        body = json.dumps(body, ensure_ascii=False).encode('utf-8')
        headers.append(('Content-Type', 'application/json; charset=utf-8'))
    if not any(key.lower() == 'cache-control' for key, _ in headers):
        headers.append(('Cache-Control', 'no-store'))
    headers.extend([('Content-Length', str(len(body))), ('X-Content-Type-Options', 'nosniff'), ('Referrer-Policy', 'same-origin'), ('X-Frame-Options', 'DENY'), ('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")])
    from http import HTTPStatus
    start_response(str(code) + ' ' + HTTPStatus(code).phrase, headers)
    return [body]


init_db()

if __name__ == '__main__':
    if len(PASSWORD) < 16:
        raise SystemExit('Définissez ADMIN_PASSWORD avec au moins 16 caractères.')
    if os.environ.get('APP_ENV') == 'production' and not (FRONTEND_DIST / 'index.html').is_file():
        raise SystemExit('Frontend absent : lancez npm --prefix frontend run build avant le démarrage.')
    threading.Thread(target=notification_worker, daemon=True).start()
    host, port = os.environ.get('HOST', '127.0.0.1'), int(os.environ.get('PORT', '8000'))
    print('HASKE Design : ' + PUBLIC_URL, flush=True)
    if os.environ.get('APP_ENV') == 'production':
        from waitress import serve
        serve(application, host=host, port=port, max_request_body_size=15 * 1024 * 1024)
    else:
        from socketserver import ThreadingMixIn
        from wsgiref.simple_server import make_server, WSGIServer

        class PreviewServer(ThreadingMixIn, WSGIServer):
            daemon_threads = True

        make_server(host, port, application, server_class=PreviewServer).serve_forever()
