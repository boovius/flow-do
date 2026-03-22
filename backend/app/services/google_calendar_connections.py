from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.core.supabase import supabase


def _iso_or_none(value: datetime | None) -> str | None:
    return value.astimezone(timezone.utc).isoformat() if value else None


def upsert_google_calendar_connection(*, user_id: str, profile: dict, token_payload: dict) -> dict:
    expires_at = None
    expires_in = token_payload.get("expires_in")
    if expires_in is not None:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))

    row = {
        "user_id": user_id,
        "google_email": profile.get("email"),
        "google_subject": profile.get("sub"),
        "access_token": token_payload.get("access_token"),
        "refresh_token": token_payload.get("refresh_token"),
        "scope": token_payload.get("scope"),
        "token_type": token_payload.get("token_type"),
        "expires_at": _iso_or_none(expires_at),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    result = (
        supabase.table("google_calendar_connections")
        .upsert(row, on_conflict="user_id")
        .execute()
    )
    return result.data[0]


def get_google_calendar_connection(*, user_id: str) -> dict | None:
    result = (
        supabase.table("google_calendar_connections")
        .select("id,user_id,google_email,google_subject,scope,token_type,expires_at,created_at,updated_at")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data


def get_google_calendar_token_data(*, user_id: str) -> dict | None:
    result = (
        supabase.table("google_calendar_connections")
        .select("access_token,refresh_token,expires_at,scope,token_type")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data


def delete_google_calendar_connection(*, user_id: str) -> None:
    supabase.table("google_calendar_connections").delete().eq("user_id", user_id).execute()
