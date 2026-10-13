#!/usr/bin/env python3
"""Private, loopback-only Northstar demo form. Secrets stay in process memory."""
import datetime as dt
import importlib.util
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
import secrets
import threading
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('sender', ROOT / 'send-demo.py')
sender = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sender)
CASES = sender.load_and_validate()
PORT = 8765
ORIGIN = f'http://127.0.0.1:{PORT}'
TOKEN = secrets.token_urlsafe(32)
LOCK = threading.Lock()
CONFIG = {}
HISTORY = ROOT / '.local' / 'live-requests.jsonl'
HISTORY.parent.mkdir(exist_ok=True)
EVENTS = [json.loads(line) for line in HISTORY.read_text().splitlines()] if HISTORY.exists() else []
MAX_REQUESTS = 14


def post_to_make(payload, case_id):
    with LOCK:
        if not CONFIG:
            return 409, {'message': 'Connect the demo webhook first.'}
        if sum(e.get('stage') == 'started' for e in EVENTS) >= MAX_REQUESTS:
            return 409, {'message': 'Test request limit reached. Review the recorded results before further testing.'}
        url, key = CONFIG['url'], CONFIG['key']
        rid = secrets.token_hex(6)
        event = {'request_id': rid, 'case_id': case_id, 'submission_id': payload.get('submission_id'),
                 'stage': 'started', 'time_utc': dt.datetime.now(dt.timezone.utc).isoformat()}
        record(event)
    request = urllib.request.Request(url, data=json.dumps(payload).encode(), method='POST',
              headers={'Content-Type': 'application/json', 'x-make-apikey': key})
    status = None
    try:
        with sender.make_opener().open(request, timeout=30) as response:
            status = response.status
        message = f'Make gateway returned HTTP {status}. Check the Make run, spreadsheet and inbox to confirm completion.'
    except urllib.error.HTTPError as exc:
        status = exc.code
        exc.close()
        message = f'Make gateway returned HTTP {status}. Inspect the workflow before retrying.'
    except (OSError, urllib.error.URLError, TimeoutError):
        message = 'The request timed out or failed. Delivery is uncertain. Inspect Make before retrying.'
    with LOCK:
        record({'request_id': rid, 'case_id': case_id, 'stage': 'finished', 'http_status': status,
                'time_utc': dt.datetime.now(dt.timezone.utc).isoformat()})
    return 200, {'message': message, 'http_status': status, 'request_id': rid,
                 'submission_id': payload.get('submission_id')}


def record(event):
    EVENTS.append(event)
    with HISTORY.open('a') as out:
        out.write(json.dumps(event) + '\n')


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def reply(self, status, data, content_type='application/json'):
        body = data.encode() if isinstance(data, str) else json.dumps(data).encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type + '; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'no-referrer')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
        self.end_headers()
        self.wfile.write(body)

    def valid_host(self):
        return self.headers.get('Host') == f'127.0.0.1:{PORT}'

    def do_GET(self):
        if not self.valid_host():
            return self.reply(403, {'message': 'Local access only.'})
        if self.path == '/':
            page = (ROOT / 'private-demo.html').read_text().replace('__CSRF_TOKEN__', TOKEN)
            return self.reply(200, page, 'text/html')
        if self.path == '/api/state':
            with LOCK:
                data = {'connected': bool(CONFIG), 'requests_used': sum(e.get('stage') == 'started' for e in EVENTS),
                        'request_limit': MAX_REQUESTS, 'events': list(EVENTS),
                        'cases': [{'id': c['case_id'], 'description': c['description']} for c in CASES.values()]}
            return self.reply(200, data)
        return self.reply(404, {'message': 'Not found.'})

    def do_POST(self):
        if (not self.valid_host() or self.headers.get('Origin') != ORIGIN
                or not secrets.compare_digest(self.headers.get('X-Demo-Token', ''), TOKEN)):
            return self.reply(403, {'message': 'Use the local demo page.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 20000:
                raise ValueError()
            data = json.loads(self.rfile.read(length))
            if not isinstance(data, dict):
                raise ValueError()
        except (ValueError, json.JSONDecodeError):
            return self.reply(400, {'message': 'Invalid request.'})
        if self.path == '/api/setup':
            try:
                url = sender.checked_url(data.get('url', '').strip())
                key = data.get('key', '').strip()
                if not key or not key.isascii() or re.search(r'[\x00-\x20\x7f]', key):
                    raise ValueError()
            except (ValueError, TypeError, AttributeError):
                return self.reply(400, {'message': 'Enter the regional Make webhook URL and the existing demo API key.'})
            with LOCK:
                CONFIG.update(url=url, key=key)
            return self.reply(200, {'message': 'Connection details stored in memory. Nothing has been sent.'})
        if self.path == '/api/case':
            case = CASES.get(data.get('case_id'))
            if not case:
                return self.reply(400, {'message': 'Choose a listed fixture.'})
            status, result = post_to_make(case['payload'], case['case_id'])
            return self.reply(status, result)
        if self.path == '/api/enquiry':
            fields = ('name', 'email', 'company', 'service', 'message')
            if any(not isinstance(data.get(k), str) or len(data[k]) > 3000 for k in fields):
                return self.reply(400, {'message': 'Complete the enquiry fields.'})
            payload = {k: data[k].strip() for k in fields}
            payload['submission_id'] = data.get('submission_id', '')
            payload['submitted_at'] = dt.datetime.now(dt.timezone.utc).isoformat()
            if (not re.fullmatch(r'demo-form-[a-f0-9-]{36}', payload['submission_id'])
                    or sender.input_errors(payload) or not payload['email'].lower().endswith('@example.com')
                    or payload['service'] not in ('website_build', 'website_care', 'other')
                    or not payload['name'] or not payload['message'] or data.get('fictional') is not True):
                return self.reply(400, {'message': 'Use fictional details, an example.com email, and complete the required fields.'})
            status, result = post_to_make(payload, 'portfolio_form')
            return self.reply(status, result)
        return self.reply(404, {'message': 'Not found.'})


if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', PORT), Handler)
    print(f'Private demo ready at {ORIGIN}. Connection secrets are held in memory only.', flush=True)
    server.serve_forever()
