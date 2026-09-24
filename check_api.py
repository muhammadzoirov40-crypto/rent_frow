import json, sqlite3, urllib.request, urllib.error
from datetime import datetime, timedelta

db = sqlite3.connect('rentflow.db')
c = db.cursor()
email = 'dalerjonski1127@gmail.com'
code = '112233'



now = datetime.utcnow()
expire = (now + timedelta(minutes=15)).isoformat(sep=' ', timespec='seconds')
c.execute("UPDATE otp_codes SET used=1 WHERE email=?", (email,))
c.execute(
    "INSERT INTO otp_codes (email, code, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)",
    (email, code, expire, now.isoformat(sep=' ', timespec='seconds')),
)
db.commit()
db.close()

def req(method, path, data=None, token=None, base='http://localhost:8000'):
    headers = {'Content-Type': 'application/json'}
    if token:
        headers['Authorization'] = f'Bearer {token}'
    body = json.dumps(data).encode() if data is not None else None
    r = urllib.request.Request(base + path, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except Exception as e:
        return 0, str(e).encode()

st, raw = req('POST', '/api/v1/auth/login', {'email': email, 'otp_code': code})
print('login', st, raw[:200])
token = json.loads(raw)['data']['access_token']

# Screenshot dates via backend
print('rental backend', req('POST', '/api/v1/rental-requests', {
    'listing_id': 2, 'start_date': '2026-09-23', 'end_date': '2026-09-30'
}, token))

# via vite proxy
print('me proxy', req('GET', '/api/v1/auth/me', token=token, base='http://localhost:5173'))
print('rental proxy', req('POST', '/api/v1/rental-requests', {
    'listing_id': 2, 'start_date': '2026-12-01', 'end_date': '2026-12-07'
}, token, base='http://localhost:5173'))
print('conv proxy', req('POST', '/api/v1/messages/conversations', {
    'user_id': 3, 'listing_id': 2
}, token, base='http://localhost:5173'))

# without token
print('rental noauth', req('POST', '/api/v1/rental-requests', {
    'listing_id': 2, 'start_date': '2026-09-23', 'end_date': '2026-09-30'
}))
