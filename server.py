#!/usr/bin/env python3
"""TODOCITY backend: аккаунты и синхронизация состояния задач.

Чистый stdlib (http.server + sqlite3), без внешних зависимостей.
Эндпоинты (все под /api):
  POST /api/register {"login","password"} -> {"token","login"}
  POST /api/login    {"login","password"} -> {"token","login"}
  POST /api/logout   (Bearer) -> 204
  GET  /api/state    (Bearer) -> {"state": {...}|null, "updated_at": epoch_ms}
  PUT  /api/state    (Bearer, тело = состояние) -> {"updated_at"}
  GET  /api/ping     -> {"ok":true}
Слушает 127.0.0.1:PORT (по умолчанию 8080) — наружу смотрит nginx (proxy /api/).
"""
import hashlib
import json
import os
import re
import secrets
import sqlite3
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.db')
PORT = int(os.environ.get('PORT', '8080'))
TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000        # 30 дней
PBKDF2_ITERS = 120_000
MAX_BODY = 5 * 1024 * 1024                      # 5 МБ на состояние
LOGIN_RE = re.compile(r'^[a-zA-Z0-9_.-]{3,32}$')
# Разрешённые источники фронтенда (localhost для разработки, GitHub Pages, сам VPS)
ORIGIN_RE = re.compile(
    r'^https?://(localhost|127\.0\.0\.1)(:\d+)?$'
    r'|^https?://104\.171\.138\.209(:\d+)?$'
    r'|^https://weplesh-hub\.github\.io$'
)


def db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.execute('PRAGMA journal_mode=WAL')
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with db() as c:
        c.execute('''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            login TEXT UNIQUE NOT NULL,
            pass_hash TEXT NOT NULL,
            token TEXT,
            token_ts INTEGER)''')
        c.execute('''CREATE TABLE IF NOT EXISTS states (
            user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
            data TEXT,
            updated_at INTEGER)''')


def hash_password(pw, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', pw.encode('utf-8'), salt.encode('utf-8'), PBKDF2_ITERS).hex()
    return f'{salt}${digest}'


def check_password(pw, stored):
    try:
        salt, _ = stored.split('$', 1)
    except ValueError:
        return False
    return secrets.compare_digest(hash_password(pw, salt), stored)


def issue_token(user_id):
    token = secrets.token_hex(32)
    now = int(time.time() * 1000)
    with db() as c:
        c.execute('UPDATE users SET token = ?, token_ts = ? WHERE id = ?', (token, now, user_id))
    return token


def user_by_token(token):
    now = int(time.time() * 1000)
    with db() as c:
        row = c.execute('SELECT id, login, token_ts FROM users WHERE token = ?', (token,)).fetchone()
    if not row or now - row['token_ts'] > TOKEN_TTL_MS:
        return None
    # скользящее продление сессии
    with db() as c:
        c.execute('UPDATE users SET token_ts = ? WHERE id = ?', (now, row['id']))
    return {'id': row['id'], 'login': row['login']}


class ApiHandler(BaseHTTPRequestHandler):
    server_version = 'TODOCITY-API/1.0'

    # --- инфраструктура ответов ---
    def cors_headers(self):
        origin = self.headers.get('Origin', '')
        if origin and ORIGIN_RE.match(origin):
            return {
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Authorization, Content-Type',
                'Access-Control-Max-Age': '86400',
                'Vary': 'Origin',
            }
        return {}

    def send_json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        for k, v in self.cors_headers().items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        length = int(self.headers.get('Content-Length') or 0)
        if length <= 0:
            raise ValueError('empty body')
        if length > MAX_BODY:
            # тело не читаем — сразу закрываем соединение после ответа
            self.close_connection = True
            raise ValueError('тело больше 5 МБ')
        return json.loads(self.rfile.read(length).decode('utf-8'))

    def route(self, method):
        try:
            handler = getattr(self, 'handle_' + method.lower(), None)
            if handler:
                handler()
            else:
                self.send_json(405, {'error': 'method not allowed'})
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as e:  # noqa: BLE001 — любая ошибка отдаётся как JSON 500
            try:
                self.send_json(500, {'error': 'внутренняя ошибка: ' + str(e)})
            except Exception:
                pass

    def do_GET(self):
        self.route('GET')

    def do_POST(self):
        self.route('POST')

    def do_PUT(self):
        self.route('PUT')

    def auth_user(self):
        header = self.headers.get('Authorization', '')
        if header.startswith('Bearer '):
            return user_by_token(header[7:].strip())
        return None

    def log_message(self, fmt, *args):
        sys.stdout.write('%s - %s\n' % (self.address_string(), fmt % args))

    # --- роутинг ---
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Content-Length', '0')
        for k, v in self.cors_headers().items():
            self.send_header(k, v)
        self.end_headers()

    def handle_get(self):
        if self.path == '/api/ping':
            return self.send_json(200, {'ok': True, 'service': 'todocity'})
        if self.path == '/api/state':
            user = self.auth_user()
            if not user:
                return self.send_json(401, {'error': 'не авторизован'})
            with db() as c:
                row = c.execute('SELECT data, updated_at FROM states WHERE user_id = ?', (user['id'],)).fetchone()
            if not row or row['data'] is None:
                return self.send_json(200, {'state': None, 'updated_at': None})
            return self.send_json(200, {'state': json.loads(row['data']), 'updated_at': row['updated_at']})
        return self.send_json(404, {'error': 'not found'})

    def handle_post(self):
        if self.path == '/api/register':
            try:
                data = self.read_json()
            except ValueError as e:
                return self.send_json(400, {'error': str(e)})
            login, password = str(data.get('login', '')), str(data.get('password', ''))
            if not LOGIN_RE.match(login):
                return self.send_json(400, {'error': 'логин: 3-32 символа, латиница/цифры/._-'})
            if len(password) < 6:
                return self.send_json(400, {'error': 'пароль: минимум 6 символов'})
            try:
                with db() as c:
                    cur = c.execute('INSERT INTO users (login, pass_hash) VALUES (?, ?)',
                                    (login, hash_password(password)))
                    user_id = cur.lastrowid
            except sqlite3.IntegrityError:
                return self.send_json(409, {'error': 'такой логин уже занят'})
            return self.send_json(201, {'token': issue_token(user_id), 'login': login})

        if self.path == '/api/login':
            try:
                data = self.read_json()
            except ValueError as e:
                return self.send_json(400, {'error': str(e)})
            login, password = str(data.get('login', '')), str(data.get('password', ''))
            with db() as c:
                row = c.execute('SELECT id, pass_hash FROM users WHERE login = ?', (login,)).fetchone()
            if not row or not check_password(password, row['pass_hash']):
                return self.send_json(401, {'error': 'неверный логин или пароль'})
            return self.send_json(200, {'token': issue_token(row['id']), 'login': login})

        if self.path == '/api/logout':
            user = self.auth_user()
            if user:
                with db() as c:
                    c.execute('UPDATE users SET token = NULL, token_ts = 0 WHERE id = ?', (user['id'],))
            return self.send_json(200, {'ok': True})

        return self.send_json(404, {'error': 'not found'})

    def handle_put(self):
        if self.path == '/api/state':
            user = self.auth_user()
            if not user:
                return self.send_json(401, {'error': 'не авторизован'})
            try:
                data = self.read_json()
            except ValueError as e:
                return self.send_json(400, {'error': str(e)})
            if not isinstance(data, dict):
                return self.send_json(400, {'error': 'state должен быть объектом'})
            now = int(time.time() * 1000)
            with db() as c:
                c.execute('''INSERT INTO states (user_id, data, updated_at) VALUES (?, ?, ?)
                             ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at''',
                          (user['id'], json.dumps(data, ensure_ascii=False), now))
            return self.send_json(200, {'updated_at': now})
        return self.send_json(404, {'error': 'not found'})


if __name__ == '__main__':
    init_db()
    print(f'todocity-backend: listening on 127.0.0.1:{PORT}, db={DB_PATH}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), ApiHandler).serve_forever()
