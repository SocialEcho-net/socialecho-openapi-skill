from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

PLUGIN_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PLUGIN_ROOT))

from tools.client import request_socialecho, validate_selected_music  # noqa: E402


class _Response:
    status_code = 200
    text = ""

    @staticmethod
    def json() -> dict[str, int]:
        return {"code": 0}


class ClientTest(unittest.TestCase):
    def test_get_uses_query_without_json_body(self) -> None:
        with patch("tools.client.requests.get", return_value=_Response()) as get:
            request_socialecho(
                {"api_key": "test"},
                "/v1/article",
                {"account_ids": [41, 42]},
            )

        kwargs = get.call_args.kwargs
        self.assertNotIn("json", kwargs)
        self.assertNotIn("Content-Type", kwargs["headers"])
        self.assertEqual(
            kwargs["params"],
            [("account_ids[]", 41), ("account_ids[]", 42)],
        )

    def test_selected_music_requires_all_nine_fields(self) -> None:
        with self.assertRaises(ValueError):
            validate_selected_music({
                "extra": {"music": {"selection": "trending_clip", "uuid": "x"}}
            })


if __name__ == "__main__":
    unittest.main()
