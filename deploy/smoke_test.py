"""Public deployment checks for SlotBook (R-02). Passwords are never printed.

WHAT THIS SCRIPT DOES
    Called by .github/workflows/deploy.yml after a deployment:
        python3 deploy/smoke_test.py SERVICE_URL
    Exits non-zero (the workflow fails) if a check fails. Each public check is
    retried up to 5 times, 3 seconds apart, for Cloud Run cold starts.

    Checks (in order)
      1. GET /api/health   -> {"status": "ok"}
      2. GET /api/ready    -> {"db": "connected"}   (the database works)
      3. GET /             -> HTML page (the built React app is served)
      4. GET /api/version  -> {"commit": ...}      (printed, compared in deploy.yml)
      5. OPTIONAL login    -> login, /api/auth/me, /api/schedules is not empty
         (migration + seed worked), logout. Runs only if BOTH SMOKE_EMAIL and
         SMOKE_PASSWORD are set. SlotBook uses an httpOnly session cookie, so a
         cookie jar keeps it between the requests. Logout always runs.

Only the Python standard library is used. Offline unit tests: deploy/tests/test_smoke.py
Adapted from the TokTickIT Lab 5 smoke test (token -> cookie, categories -> schedules).
"""
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.request


def make_opener():
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


# Returns the response body (bytes). Raises on HTTP errors and timeouts.
def request(base, path, data=None, opener=None):
    headers = {'Content-Type': 'application/json'} if data is not None else {}
    req = urllib.request.Request(base + path, headers=headers,
                                 data=json.dumps(data).encode() if data is not None else None)
    with (opener or make_opener()).open(req, timeout=30) as response:
        return response.read()


def check(base):
    for path, predicate in (
        ('/api/health', lambda b: json.loads(b).get('status') == 'ok'),
        ('/api/ready', lambda b: json.loads(b).get('db') == 'connected'),
        ('/', lambda b: b'<html' in b.lower()),
        ('/api/version', lambda b: bool(json.loads(b).get('commit'))),
    ):
        for attempt in range(5):
            try:
                if not predicate(request(base, path)):
                    raise ValueError('Unexpected response')
                break
            except (urllib.error.URLError, TimeoutError, ValueError):
                if attempt == 4:
                    raise RuntimeError('Smoke check failed: ' + path) from None
                time.sleep(3)
        print('PASS ' + path)

    email, password = os.getenv('SMOKE_EMAIL'), os.getenv('SMOKE_PASSWORD')
    if bool(email) != bool(password):
        raise RuntimeError('Set both SMOKE_EMAIL and SMOKE_PASSWORD, or neither.')
    if not email:
        print('SKIP login: optional smoke credentials not configured')
        return

    opener = make_opener()
    logged_in = False
    try:
        request(base, '/api/auth/login', {'email': email, 'password': password}, opener)
        logged_in = True
        me = json.loads(request(base, '/api/auth/me', opener=opener))
        if 'role' not in me:
            raise ValueError('No role')
        schedules = json.loads(request(base, '/api/schedules', opener=opener))
        if not isinstance(schedules, list) or not schedules:
            raise ValueError('No schedule')
        print('PASS login, /api/auth/me and /api/schedules (%d schedules)' % len(schedules))
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError):
        raise RuntimeError('Login smoke check failed') from None
    finally:
        if logged_in:
            request(base, '/api/auth/logout', data={}, opener=opener)
            print('PASS logout')


if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 deploy/smoke_test.py SERVICE_URL')
    check(sys.argv[1].rstrip('/'))
