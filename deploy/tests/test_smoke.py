"""Offline unit tests for deploy/smoke_test.py (the network is mocked).

Run (repo root):  python3 -m unittest discover -s deploy/tests -p 'test_smoke.py'
CI runs it too (.github/workflows/ci-docker.yml).
"""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('smoke', Path(__file__).parents[1] / 'smoke_test.py')
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)

RESPONSES = {
    '/api/health': b'{"status":"ok"}',
    '/api/ready': b'{"status":"ready","db":"connected"}',
    '/': b'<html></html>',
    '/api/version': b'{"commit":"abc"}',
    '/api/auth/login': b'{"id":1,"role":"STUDENT"}',
    '/api/auth/me': b'{"id":1,"role":"STUDENT"}',
    '/api/schedules': b'[{"id":1,"name":"Calculus I"}]',
    '/api/auth/logout': b'',
}


def fake(base, path, data=None, opener=None):
    return RESPONSES[path]


class SmokeTests(unittest.TestCase):
    @patch.dict('os.environ', {}, clear=True)
    def test_public_checks_pass_and_skip_optional_login(self):
        with patch.object(smoke, 'request', side_effect=fake) as req:
            smoke.check('https://demo.test')
            self.assertEqual(req.call_count, 4)

    @patch.dict('os.environ', {}, clear=True)
    def test_db_not_ready_fails_even_when_http_responds(self):
        def disconnected(base, path, data=None, opener=None):
            return b'{"db":"disconnected"}' if path == '/api/ready' else fake(base, path)
        with patch.object(smoke, 'request', side_effect=disconnected), patch.object(smoke.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, '/api/ready'):
                smoke.check('https://demo.test')

    @patch.dict('os.environ', {'SMOKE_EMAIL': 'smoke@example.test', 'SMOKE_PASSWORD': 'test-only'}, clear=True)
    def test_login_flow_uses_one_cookie_jar_and_logs_out(self):
        with patch.object(smoke, 'request', side_effect=fake) as req:
            smoke.check('https://demo.test')
        login_calls = req.call_args_list[4:]
        self.assertEqual([c.args[1] for c in login_calls], ['/api/auth/login', '/api/auth/me', '/api/schedules', '/api/auth/logout'])
        openers = {id(c.kwargs.get('opener') or c.args[3]) for c in login_calls}
        self.assertEqual(len(openers), 1)

    @patch.dict('os.environ', {'SMOKE_EMAIL': 'smoke@example.test', 'SMOKE_PASSWORD': 'test-only'}, clear=True)
    def test_session_is_logged_out_even_if_schedules_is_empty(self):
        def empty(base, path, data=None, opener=None):
            return b'[]' if path == '/api/schedules' else fake(base, path)
        with patch.object(smoke, 'request', side_effect=empty) as req:
            with self.assertRaisesRegex(RuntimeError, 'Login smoke'):
                smoke.check('https://demo.test')
            self.assertEqual(req.call_args.args[1], '/api/auth/logout')


if __name__ == '__main__':
    unittest.main()
