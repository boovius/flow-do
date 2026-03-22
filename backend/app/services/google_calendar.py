from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone

import httpx

from app.core.supabase import supabase

GOOGLE_CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"


def _utc_day_bounds(day: date) -> tuple[str, str]:
    start = datetime.combine(day, time.min, tzinfo=timezone.utc)
    end = start + timedelta(days=1)
    return start.isoformat(), end.isoformat()


async def fetch_primary_calendar_events_for_day(*, access_token: str, day: date) -> list[dict]:
    time_min, time_max = _utc_day_bounds(day)
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            GOOGLE_CALENDAR_EVENTS_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            params={
                "singleEvents": "true",
                "orderBy": "startTime",
                "timeMin": time_min,
                "timeMax": time_max,
            },
        )
        response.raise_for_status()
        payload = response.json()
        return payload.get("items", [])


def update_google_calendar_tokens(*, user_id: str, token_payload: dict) -> None:
    expires_at = None
    expires_in = token_payload.get("expires_in")
    if expires_in is not None:
        expires_at = (datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))).isoformat()

    updates = {
        "access_token": token_payload.get("access_token"),
        "token_type": token_payload.get("token_type"),
        "scope": token_payload.get("scope"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at,
    }
    if token_payload.get("refresh_token"):
        updates["refresh_token"] = token_payload.get("refresh_token")

    supabase.table("google_calendar_connections").update(updates).eq("user_id", user_id).execute()
