from collections import defaultdict
from datetime import datetime

from app.core.supabase import supabase
from app.services.period import get_period_window


def inject_counts(dos_data: list[dict], now: datetime) -> None:
    """Set completion_count on each maintenance do in-place, based on maintenance_logs."""
    maintenance = [d for d in dos_data if d.get("do_type") == "maintenance"]
    if not maintenance:
        return

    by_unit: dict[str, list[str]] = defaultdict(list)
    for d in maintenance:
        by_unit[d["time_unit"]].append(d["id"])

    counts: dict[str, int] = {}
    for unit, ids in by_unit.items():
        start, end = get_period_window(unit, now)
        rows = (
            supabase.table("maintenance_logs")
            .select("do_id")
            .in_("do_id", ids)
            .gte("logged_at", start.isoformat())
            .lt("logged_at", end.isoformat())
            .execute()
            .data
            or []
        )
        for row in rows:
            counts[row["do_id"]] = counts.get(row["do_id"], 0) + 1

    for d in maintenance:
        d["completion_count"] = counts.get(str(d["id"]), 0)


def get_count(do_id: str, time_unit: str, now: datetime) -> int:
    """Count maintenance_logs for a single do within its current time window."""
    start, end = get_period_window(time_unit, now)
    rows = (
        supabase.table("maintenance_logs")
        .select("id")
        .eq("do_id", do_id)
        .gte("logged_at", start.isoformat())
        .lt("logged_at", end.isoformat())
        .execute()
        .data
        or []
    )
    return len(rows)
