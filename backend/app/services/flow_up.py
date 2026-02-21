import logging
from datetime import datetime, timezone

from app.core.supabase import supabase

logger = logging.getLogger(__name__)


def _is_season_start(dt: datetime) -> bool:
    """Returns True if dt falls on a meteorological season start (Mar/Jun/Sep/Dec 1)."""
    return dt.day == 1 and dt.month in (3, 6, 9, 12)


def run_flow_up() -> dict:
    """
    Implements flow-up entirely in Python — no stored procedure.

    Logic (evaluated at current UTC time):
      - Every day        : today   → week
      - Every Monday     : week    → month
      - Every 1st of month: month  → season
      - Mar/Jun/Sep/Dec 1: season  → year

    For items that flow: time_unit advances, flow_count += 1, days_in_unit resets to 0.
    For items that stay: days_in_unit += 1 (staleness counter).

    All changes are applied in a single batch upsert.
    Returns a summary dict of how many items moved per transition.
    """
    now_utc = datetime.now(timezone.utc)
    is_monday = now_utc.isoweekday() == 1
    is_first_of_month = now_utc.day == 1
    is_season_start = _is_season_start(now_utc)
    now_iso = now_utc.isoformat()

    try:
        result = (
            supabase.table("dos")
            .select("id,time_unit,days_in_unit,flow_count")
            .eq("completed", False)
            .execute()
        )
        items = result.data or []
    except Exception:
        logger.exception("flow_up: failed to fetch dos")
        raise

    summary: dict[str, int] = {}
    updates: list[dict] = []

    for item in items:
        unit = item["time_unit"]
        new_unit: str | None = None

        if unit == "today":
            new_unit = "week"
        elif unit == "week" and is_monday:
            new_unit = "month"
        elif unit == "month" and is_first_of_month:
            new_unit = "season"
        elif unit == "season" and is_season_start:
            new_unit = "year"

        if new_unit:
            key = f"{unit}_to_{new_unit}"
            summary[key] = summary.get(key, 0) + 1
            updates.append({
                "id": item["id"],
                "time_unit": new_unit,
                "flow_count": item["flow_count"] + 1,
                "days_in_unit": 0,
                "updated_at": now_iso,
            })
        else:
            updates.append({
                "id": item["id"],
                "days_in_unit": item["days_in_unit"] + 1,
                "updated_at": now_iso,
            })

    if updates:
        try:
            supabase.table("dos").upsert(updates, on_conflict="id").execute()
        except Exception:
            logger.exception("flow_up: failed to apply updates")
            raise

    logger.info("flow_up complete: %s", summary)
    return summary
