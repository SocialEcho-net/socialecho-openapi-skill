from __future__ import annotations

import json
from typing import Any

import requests

PRODUCTION_BASE_URL = "https://api.socialecho.net"
SUCCESS_CODES = {0}


def _build_headers(credentials: dict[str, Any]) -> dict[str, str]:
    api_key = str(credentials.get("api_key", "")).strip()
    if not api_key:
        raise ValueError("Missing required credential: api_key")

    headers = {
        "Authorization": f"Bearer {api_key}",
    }

    x_lang = str(credentials.get("x_lang", "")).strip()
    if x_lang:
        headers["X-Lang"] = x_lang

    return headers


def request_socialecho(
    credentials: dict[str, Any],
    path: str,
    body: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Call SocialEcho external API.

    GET parameters use the query string. CloudFront rejects GET requests with a body.
    """
    base_url = PRODUCTION_BASE_URL.rstrip("/")
    clean = {k: v for k, v in (body or {}).items() if v is not None}

    query: list[tuple[str, Any]] = []
    for key, value in clean.items():
        if isinstance(value, list):
            query.extend((f"{key}[]", item) for item in value)
        else:
            query.append((key, value))

    response = requests.get(
        url=f"{base_url}{path}",
        params=query,
        headers=_build_headers(credentials),
        timeout=30,
    )

    try:
        payload: Any = response.json()
    except Exception as e:
        raise ValueError(
            f"Invalid JSON response. HTTP {response.status_code}, body={response.text[:500]}"
        ) from e

    if response.status_code != 200:
        raise ValueError(f"HTTP {response.status_code} error: {payload}")

    if not isinstance(payload, dict):
        raise ValueError(f"Unexpected response body type: {type(payload)}")

    code = payload.get("code")
    if code not in SUCCESS_CODES:
        raise ValueError(
            f"Business error: code={payload.get('code')}, message={payload.get('message')}"
        )

    return payload


def request_socialecho_post(
    credentials: dict[str, Any],
    path: str,
    body: dict[str, Any],
    timeout: int = 120,
) -> dict[str, Any]:
    """POST /v1/... with JSON body (e.g. publish article)."""
    base_url = PRODUCTION_BASE_URL.rstrip("/")
    response = requests.post(
        url=f"{base_url}{path}",
        json=body,
        headers=_build_headers(credentials),
        timeout=timeout,
    )
    try:
        payload: Any = response.json()
    except Exception as e:
        raise ValueError(
            f"Invalid JSON response. HTTP {response.status_code}, body={response.text[:500]}"
        ) from e

    if response.status_code != 200:
        raise ValueError(f"HTTP {response.status_code} error: {payload}")

    if not isinstance(payload, dict):
        raise ValueError(f"Unexpected response body type: {type(payload)}")

    code = payload.get("code")
    if code not in SUCCESS_CODES:
        raise ValueError(
            f"Business error: code={payload.get('code')}, message={payload.get('message')}"
        )

    return payload


def parse_json_object(raw: str) -> dict[str, Any]:
    """Parse user/LLM-provided JSON string into a dict."""
    s = str(raw).strip()
    if not s:
        raise ValueError("JSON body is empty")
    try:
        out: Any = json.loads(s)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e}") from e
    if not isinstance(out, dict):
        raise ValueError("JSON body must be a JSON object")
    return out


def validate_selected_music(payload: dict[str, Any]) -> None:
    music = payload.get("extra", {}).get("music") if isinstance(payload.get("extra"), dict) else None
    if music is None or (isinstance(music, dict) and music.get("selection") == "none"):
        return
    if not isinstance(music, dict):
        raise ValueError("extra.music must be an object")
    required = {
        "url", "uuid", "cover", "title", "artist", "duration",
        "selection", "music_volume", "original_sound_volume",
    }
    missing = sorted(key for key in required if music.get(key) in (None, ""))
    if missing:
        raise ValueError(f"Selected extra.music is missing: {', '.join(missing)}")
    if music["selection"] not in {"trending_clip", "full_track"}:
        raise ValueError("extra.music.selection must be none, trending_clip, or full_track")
    for field in ("music_volume", "original_sound_volume"):
        if not isinstance(music[field], int) or not 0 <= music[field] <= 100:
            raise ValueError(f"extra.music.{field} must be an integer between 0 and 100")


def parse_account_ids_csv(raw: str | None) -> list[int] | None:
    """Turn CSV '1,2,3' into [1, 2, 3]. Empty/whitespace -> None (omit field)."""
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    out: list[int] = []
    for part in s.split(","):
        p = part.strip()
        if not p:
            continue
        out.append(int(p))
    return out or None
