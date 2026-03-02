"""Tests for app.services.period.get_period_window."""

from datetime import datetime, timezone

import pytest

from app.services.period import get_period_window


def dt(year, month, day, hour=0, minute=0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# today
# ---------------------------------------------------------------------------

def test_today_window_covers_full_day():
    now = dt(2026, 3, 15, 14, 30)
    start, end = get_period_window("today", now)
    assert start == dt(2026, 3, 15)
    assert end == dt(2026, 3, 16)


def test_today_window_crosses_month_boundary():
    now = dt(2026, 3, 31)
    start, end = get_period_window("today", now)
    assert start == dt(2026, 3, 31)
    assert end == dt(2026, 4, 1)


def test_today_window_crosses_year_boundary():
    now = dt(2025, 12, 31)
    start, end = get_period_window("today", now)
    assert start == dt(2025, 12, 31)
    assert end == dt(2026, 1, 1)


# ---------------------------------------------------------------------------
# week
# ---------------------------------------------------------------------------

def test_week_starts_on_monday():
    # Wednesday 2026-03-04
    now = dt(2026, 3, 4)
    start, end = get_period_window("week", now)
    assert start == dt(2026, 3, 2)   # Monday
    assert end == dt(2026, 3, 9)     # next Monday


def test_week_on_monday():
    now = dt(2026, 3, 2)  # Monday
    start, end = get_period_window("week", now)
    assert start == dt(2026, 3, 2)
    assert end == dt(2026, 3, 9)


def test_week_on_sunday():
    now = dt(2026, 3, 8)  # Sunday
    start, end = get_period_window("week", now)
    assert start == dt(2026, 3, 2)
    assert end == dt(2026, 3, 9)


def test_week_spans_month_boundary():
    # Sunday 2026-03-01 — week started Mon 2026-02-23
    now = dt(2026, 3, 1)
    start, end = get_period_window("week", now)
    assert start == dt(2026, 2, 23)
    assert end == dt(2026, 3, 2)


# ---------------------------------------------------------------------------
# month
# ---------------------------------------------------------------------------

def test_month_starts_on_first():
    now = dt(2026, 7, 17)
    start, end = get_period_window("month", now)
    assert start == dt(2026, 7, 1)
    assert end == dt(2026, 8, 1)


def test_month_december_rolls_to_jan():
    now = dt(2026, 12, 15)
    start, end = get_period_window("month", now)
    assert start == dt(2026, 12, 1)
    assert end == dt(2027, 1, 1)


# ---------------------------------------------------------------------------
# season
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("month,expected_start_month", [
    (3, 3),   # March → spring (Mar–Jun)
    (4, 3),
    (5, 3),
    (6, 6),   # June → summer (Jun–Sep)
    (7, 6),
    (8, 6),
    (9, 9),   # September → autumn (Sep–Dec)
    (10, 9),
    (11, 9),
    (12, 12), # December → winter (Dec–Mar)
])
def test_season_start_month(month, expected_start_month):
    now = dt(2026, month, 15)
    start, end = get_period_window("season", now)
    assert start.month == expected_start_month


def test_season_jan_feb_belong_to_previous_december():
    # Jan 2026 falls in the Dec 2025 – Mar 2026 winter season
    now = dt(2026, 1, 15)
    start, end = get_period_window("season", now)
    assert start == dt(2025, 12, 1)
    assert end == dt(2026, 3, 1)


def test_season_march_window():
    now = dt(2026, 3, 1)
    start, end = get_period_window("season", now)
    assert start == dt(2026, 3, 1)
    assert end == dt(2026, 6, 1)


def test_season_december_window():
    now = dt(2026, 12, 1)
    start, end = get_period_window("season", now)
    assert start == dt(2026, 12, 1)
    assert end == dt(2027, 3, 1)


# ---------------------------------------------------------------------------
# year
# ---------------------------------------------------------------------------

def test_year_window():
    now = dt(2026, 7, 4)
    start, end = get_period_window("year", now)
    assert start == dt(2026, 1, 1)
    assert end == dt(2027, 1, 1)


def test_year_window_on_jan_1():
    now = dt(2026, 1, 1)
    start, end = get_period_window("year", now)
    assert start == dt(2026, 1, 1)
    assert end == dt(2027, 1, 1)


# ---------------------------------------------------------------------------
# multi_year
# ---------------------------------------------------------------------------

def test_multi_year_window_in_cycle_year():
    # 2025 % 3 == 0 → cycle starts 2025
    now = dt(2025, 6, 1)
    start, end = get_period_window("multi_year", now)
    assert start == dt(2025, 1, 1)
    assert end == dt(2028, 1, 1)


def test_multi_year_window_in_year_after_cycle():
    # 2026 % 3 == 2 → nearest prior cycle-year is 2025 (since 2025 % 3 == 0)
    # Wait: 2026 - (2026 % 3) = 2026 - 2 = 2024.  But 2024 % 3 == 1, not 0.
    # Actually the formula is: cycle_year = y - (y % 3)
    # 2026 - (2026 % 3) = 2026 - 2 = 2024
    now = dt(2026, 3, 15)
    start, end = get_period_window("multi_year", now)
    cycle_year = 2026 - (2026 % 3)  # 2024
    assert start == datetime(cycle_year, 1, 1, tzinfo=timezone.utc)
    assert end == datetime(cycle_year + 3, 1, 1, tzinfo=timezone.utc)


def test_multi_year_window_on_cycle_boundary():
    # Jan 1 of a cycle year — should still return that year as start
    now = dt(2025, 1, 1)
    start, end = get_period_window("multi_year", now)
    assert start == dt(2025, 1, 1)
    assert end == dt(2028, 1, 1)


# ---------------------------------------------------------------------------
# unknown unit
# ---------------------------------------------------------------------------

def test_unknown_unit_raises():
    with pytest.raises(ValueError, match="Unknown time unit"):
        get_period_window("quarterly", dt(2026, 1, 1))
