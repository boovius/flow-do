import calendar
from datetime import datetime, timedelta, timezone


def get_period_window(unit: str, now: datetime) -> tuple[datetime, datetime]:
    """
    Return (start, end) UTC datetimes for the active time window of the given unit.

    Both bounds are timezone-aware. The window is [start, end).
    """
    y, m, d = now.year, now.month, now.day

    if unit == "today":
        start = datetime(y, m, d, tzinfo=timezone.utc)
        end = start + timedelta(days=1)

    elif unit == "week":
        # Most-recent Monday (isoweekday: Mon=1 … Sun=7)
        days_since_monday = now.isoweekday() - 1
        start = datetime(y, m, d, tzinfo=timezone.utc) - timedelta(days=days_since_monday)
        end = start + timedelta(days=7)

    elif unit == "month":
        start = datetime(y, m, 1, tzinfo=timezone.utc)
        end = _first_of_next_month(y, m)

    elif unit == "season":
        season_month, season_year = _season_start(m, y)
        start = datetime(season_year, season_month, 1, tzinfo=timezone.utc)
        next_month = season_month + 3
        if next_month > 12:
            end = datetime(season_year + 1, next_month - 12, 1, tzinfo=timezone.utc)
        else:
            end = datetime(season_year, next_month, 1, tzinfo=timezone.utc)

    elif unit == "year":
        start = datetime(y, 1, 1, tzinfo=timezone.utc)
        end = datetime(y + 1, 1, 1, tzinfo=timezone.utc)

    elif unit == "multi_year":
        # Cycle-years are divisible by 3; find the most recent one <= current year
        cycle_year = y - (y % 3)
        start = datetime(cycle_year, 1, 1, tzinfo=timezone.utc)
        end = datetime(cycle_year + 3, 1, 1, tzinfo=timezone.utc)

    else:
        raise ValueError(f"Unknown time unit: {unit!r}")

    return start, end


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _first_of_next_month(year: int, month: int) -> datetime:
    if month == 12:
        return datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    return datetime(year, month + 1, 1, tzinfo=timezone.utc)


def _season_start(month: int, year: int) -> tuple[int, int]:
    """
    Return (start_month, start_year) for the meteorological season containing
    the given month.  Seasons start on Mar/Jun/Sep/Dec 1.
    Jan and Feb belong to the Dec season of the *previous* year.
    """
    if month < 3:
        return 12, year - 1
    elif month < 6:
        return 3, year
    elif month < 9:
        return 6, year
    elif month < 12:
        return 9, year
    else:
        return 12, year
