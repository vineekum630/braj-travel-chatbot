import os
import unittest
from unittest.mock import patch

from app import app


class ChatApiTests(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_health_check(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "ok"})

    def test_rejects_missing_messages(self):
        response = self.client.post("/api/chat", json={})
        self.assertEqual(response.status_code, 400)

    def test_rejects_invalid_role(self):
        response = self.client.post(
            "/api/chat",
            json={"messages": [{"role": "system", "content": "Not allowed"}]},
        )
        self.assertEqual(response.status_code, 400)

    def test_rejects_too_many_messages(self):
        messages = [{"role": "user", "content": "Hello"}] * 21
        response = self.client.post("/api/chat", json={"messages": messages})
        self.assertEqual(response.status_code, 400)

    def test_requires_gemini_key(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
            response = self.client.post(
                "/api/chat",
                json={"messages": [{"role": "user", "content": "Hello"}]},
            )
        self.assertEqual(response.status_code, 503)
        self.assertIn("GEMINI_API_KEY", response.get_json()["error"])


if __name__ == "__main__":
    unittest.main()
