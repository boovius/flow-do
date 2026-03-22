from __future__ import annotations

"""
Google OAuth helper functions for Flow-Do.

How the pieces fit together:
1. `google_oauth_configured()` guards whether the backend has the required env vars.
2. `create_google_oauth_state()` creates a signed state payload tied to the current Flow-Do user.
3. `build_google_auth_url()` turns that state into a Google consent-screen URL.
4. After Google redirects back, `parse_google_oauth_state()` verifies the signed state.
5. `exchange_google_code()` swaps the callback code for access/refresh tokens.
6. `fetch_google_userinfo()` verifies which Google account was actually connected.
7. `refresh_google_access_token()` is used later once persisted connections start expiring.

This module intentionally focuses on OAuth mechanics and Google HTTP calls.
Persistence of connected accounts/tokens is handled elsewhere.
"""

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import TypedDict
from urllib.parse import urlencode

import httpx

from app.core.config import settings

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.readonly"


class GoogleOAuthStatePayload(TypedDict):
    user_id: str
    nonce: str
    iat: int


class GoogleTokenPayload(TypedDict, total=False):
    access_token: str
    refresh_token: str
    expires_in: int
    scope: str
    token_type: str


class GoogleUserInfo(TypedDict, total=False):
    sub: str
    email: str
    email_verified: bool
    name: str
    picture: str


def google_oauth_configured() -> bool:
    """Return True when the required Google OAuth env vars are present."""
    return all(
        [
            settings.GOOGLE_CLIENT_ID,
            settings.GOOGLE_CLIENT_SECRET,
            settings.GOOGLE_REDIRECT_URI,
            settings.GOOGLE_OAUTH_STATE_SECRET,
        ]
    )


def _b64url(data: bytes) -> str:
    """Encode bytes as URL-safe base64 without trailing padding."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def create_google_oauth_state(*, user_id: str) -> str:
    """Create a signed short-lived OAuth state value tied to the current Flow-Do user."""
    payload: GoogleOAuthStatePayload = {
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


def parse_google_oauth_state(state: str, *, max_age_seconds: int = 900) -> GoogleOAuthStatePayload:
    """Verify and decode a previously signed OAuth state payload."""
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
    """Build the Google consent-screen URL for the Calendar read-only scope."""
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


async def exchange_google_code(*, code: str) -> GoogleTokenPayload:
    """Exchange the Google OAuth callback code for access/refresh tokens."""
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


async def refresh_google_access_token(*, refresh_token: str) -> GoogleTokenPayload:
    """Refresh an expired Google access token using the saved refresh token."""
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


async def fetch_google_userinfo(*, access_token: str) -> GoogleUserInfo:
    """Fetch basic profile information for the newly connected Google account."""
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return response.json()
