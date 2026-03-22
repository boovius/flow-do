from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from urllib.parse import urlencode

import httpx

from app.core.config import settings

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly"


def google_oauth_configured() -> bool:
    return all(
        [
            settings.GOOGLE_CLIENT_ID,
            settings.GOOGLE_CLIENT_SECRET,
            settings.GOOGLE_REDIRECT_URI,
            settings.GOOGLE_OAUTH_STATE_SECRET,
        ]
    )


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def create_google_oauth_state(*, user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "nonce": secrets.token_urlsafe(12),
        "iat": int(time.time()),
    }
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    payload_part = _b64url(payload_bytes)
    sig = hmac.new(
        settings.GOOGLE_OAUTH_STATE_SECRET.encode("utf-8"),
        payload_part.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{payload_part}.{_b64url(sig)}"


def parse_google_oauth_state(state: str, *, max_age_seconds: int = 900) -> dict:
    try:
        payload_part, sig_part = state.split(".", 1)
    except ValueError as exc:
        raise ValueError("Invalid OAuth state") from exc

    expected_sig = hmac.new(
        settings.GOOGLE_OAUTH_STATE_SECRET.encode("utf-8"),
        payload_part.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    provided_sig = base64.urlsafe_b64decode(sig_part + "=")
    if not hmac.compare_digest(expected_sig, provided_sig):
        raise ValueError("Invalid OAuth state signature")

    payload = json.loads(base64.urlsafe_b64decode(payload_part + "=").decode("utf-8"))
    iat = int(payload.get("iat", 0))
    if int(time.time()) - iat > max_age_seconds:
        raise ValueError("OAuth state expired")
    return payload


def build_google_auth_url(*, state: str) -> str:
    query = urlencode(
        {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "access_type": "offline",
            "prompt": "consent",
            "scope": GOOGLE_CALENDAR_SCOPE,
            "state": state,
            "include_granted_scopes": "true",
        }
    )
    return f"{GOOGLE_AUTH_URL}?{query}"


async def exchange_google_code(*, code: str) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        response.raise_for_status()
        return response.json()


async def refresh_google_access_token(*, refresh_token: str) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        response.raise_for_status()
        return response.json()


async def fetch_google_userinfo(*, access_token: str) -> dict:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return response.json()
