import logging
from datetime import datetime, timezone

from app.core.supabase import supabase

logger = logging.getLogger(__name__)


def _is_season_start(dt: datetime) -> bool:
    """Returns True if dt falls on a meteorological season start (Mar/Jun/Sep/Dec 1)."""
    return dt.day == 1 and dt.month in (3, 6, 9, 12)


def _compute_maintenance_update(item: dict, now_utc: datetime, now_iso: str) -> tuple[dict, str | None]:
    """
    Compute the upsert payload for a maintenance do.

    Maintenance dos flow to higher time units using the same rules as normal dos.
    completion_count is never reset here — it is computed from maintenance_logs
    at query time.

    Returns (update_dict, transition_key) mirroring _compute_normal_update.
    """
    unit = item["time_unit"]
    new_unit: str | None = None

    if unit == "today":
        new_unit = "week"
    elif unit == "week" and now_utc.isoweekday() == 1:
        new_unit = "month"
    elif unit == "month" and now_utc.day == 1:
        new_unit = "season"
    elif unit == "season" and _is_season_start(now_utc):
        new_unit = "year"

    if new_unit:
        return {
            "id": item["id"],
            "user_id": item["user_id"],
            "title": item["title"],
            "time_unit": new_unit,
            "flow_count": item["flow_count"] + 1,
            "completion_count": item["completion_count"],
            "days_in_unit": 0,
            "updated_at": now_iso,
        }, f"{unit}_to_{new_unit}"

    return {
        "id": item["id"],
        "user_id": item["user_id"],
        "title": item["title"],
        "time_unit": unit,
        "flow_count": item["flow_count"],
        "completion_count": item["completion_count"],
        "days_in_unit": item["days_in_unit"] + 1,
        "updated_at": now_iso,
    }, None


def _compute_normal_update(item: dict, now_utc: datetime, now_iso: str) -> tuple[dict, str | None]:
    """
    Compute the upsert payload for a normal do.

    Returns (update_dict, transition_key) where transition_key is e.g. "today_to_week"
    when the item flows to a new time unit, or None when it stays put.

    Flow rules:
      - today  → week   : every day
      - week   → month  : every Monday
      - month  → season : every 1st of the month
      - season → year   : every Mar/Jun/Sep/Dec 1
    """
    unit = item["time_unit"]
    new_unit: str | None = None

    if unit == "today":
        new_unit = "week"
    elif unit == "week" and now_utc.isoweekday() == 1:
        new_unit = "month"
    elif unit == "month" and now_utc.day == 1:
        new_unit = "season"
    elif unit == "season" and _is_season_start(now_utc):
        new_unit = "year"

    if new_unit:
        return {
            "id": item["id"],
            "user_id": item["user_id"],
            "title": item["title"],
            "time_unit": new_unit,
            "flow_count": item["flow_count"] + 1,
            "completion_count": item["completion_count"],
            "days_in_unit": 0,
            "updated_at": now_iso,
        }, f"{unit}_to_{new_unit}"
    else:
        return {
            "id": item["id"],
            "user_id": item["user_id"],
            "title": item["title"],
            "time_unit": unit,
            "flow_count": item["flow_count"],
            "completion_count": item["completion_count"],
            "days_in_unit": item["days_in_unit"] + 1,
            "updated_at": now_iso,
        }, None


def run_flow_up() -> dict:
    """
    Implements flow-up entirely in Python — no stored procedure.

    Fetches all dos (completed and uncompleted), computes each item's new state,
    and applies all changes in a single batch upsert.

    Returns a summary dict of how many items moved per transition,
    e.g. {"today_to_week": 3, "week_to_month": 1}.
    """
    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()

    try:
        result = (
            supabase.table("dos")
            .select("id,user_id,title,time_unit,do_type,days_in_unit,flow_count,completion_count")
            .execute()
        )
        items = result.data or []
    except Exception:
        logger.exception("flow_up: failed to fetch dos")
        raise

    summary: dict[str, int] = {}
    updates: list[dict] = []

    for item in items:
        do_type = item.get("do_type", "normal")
        if do_type == "maintenance":
            update, transition = _compute_maintenance_update(item, now_utc, now_iso)
        else:
            update, transition = _compute_normal_update(item, now_utc, now_iso)
        updates.append(update)
        if transition:
            summary[transition] = summary.get(transition, 0) + 1

    if updates:
        try:
            supabase.table("dos").upsert(updates, on_conflict="id").execute()
        except Exception:
            logger.exception("flow_up: failed to apply updates")
            raise

    logger.info("flow_up complete: %s", summary)
    return summary
