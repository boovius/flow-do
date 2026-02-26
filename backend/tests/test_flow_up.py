"""
Tests for app.services.flow_up helper functions.

These tests exercise the pure computation logic only — no database calls are made.
The helpers (_compute_maintenance_update, _compute_normal_update) take plain dicts
and a datetime, so they're straightforward to test without any mocking.
"""

from datetime import datetime, timezone

import pytest

from app.services.flow_up import (
    _compute_maintenance_update,
    _compute_normal_update,
    _is_season_start,
)

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

NOW_ISO = "2026-02-10T00:00:00+00:00"

# A Tuesday in mid-February — triggers no special conditions
PLAIN_DAY = datetime(2026, 2, 10, 0, 0, tzinfo=timezone.utc)

# A Monday — triggers week → month
A_MONDAY = datetime(2026, 2, 9, 0, 0, tzinfo=timezone.utc)

# 1st of a non-season month (April) — triggers month → season
A_FIRST_NON_SEASON = datetime(2026, 4, 1, 0, 0, tzinfo=timezone.utc)

# March 1 — triggers both month → season AND season → year
SEASON_START = datetime(2026, 3, 1, 0, 0, tzinfo=timezone.utc)

# Jan 1 of a non-cycle year — triggers year reset but NOT multi_year reset
NEW_YEAR_NON_CYCLE = datetime(2026, 1, 1, 0, 0, tzinfo=timezone.utc)  # 2026 % 3 = 2

# Jan 1 of a cycle year (divisible by 3) — triggers both year AND multi_year reset
NEW_YEAR_CYCLE = datetime(2025, 1, 1, 0, 0, tzinfo=timezone.utc)  # 2025 % 3 = 0


def make_item(**overrides) -> dict:
    """Return a minimal valid do item dict, with any field overridable."""
    base = {
        "id": "test-id",
        "user_id": "user-id",
        "title": "Test do",
        "time_unit": "today",
        "do_type": "normal",
        "flow_count": 0,
        "completion_count": 0,
        "days_in_unit": 0,
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# _is_season_start
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("month", [3, 6, 9, 12])
def test_is_season_start_on_first_of_season_months(month):
    dt = datetime(2026, month, 1, tzinfo=timezone.utc)
    assert _is_season_start(dt)


@pytest.mark.parametrize("month", [1, 2, 4, 5, 7, 8, 10, 11])
def test_is_season_start_false_for_non_season_months(month):
    dt = datetime(2026, month, 1, tzinfo=timezone.utc)
    assert not _is_season_start(dt)


def test_is_season_start_false_when_not_first_of_month():
    assert not _is_season_start(datetime(2026, 3, 15, tzinfo=timezone.utc))


# ---------------------------------------------------------------------------
# _compute_normal_update — result dict shape
# ---------------------------------------------------------------------------


def test_normal_update_dict_always_has_required_keys():
    """Every returned dict must contain exactly the homogeneous key set."""
    required = {"id", "user_id", "title", "time_unit", "flow_count", "completion_count", "days_in_unit", "updated_at"}
    item = make_item(time_unit="week")
    update, _ = _compute_normal_update(item, A_MONDAY, NOW_ISO)
    assert required == set(update.keys())


# ---------------------------------------------------------------------------
# _compute_normal_update — flow rules
# ---------------------------------------------------------------------------


def test_today_always_flows_to_week():
    item = make_item(time_unit="today")
    update, transition = _compute_normal_update(item, PLAIN_DAY, NOW_ISO)
    assert update["time_unit"] == "week"
    assert update["flow_count"] == 1
    assert update["days_in_unit"] == 0
    assert transition == "today_to_week"


def test_today_flows_to_week_even_when_completed():
    """Completed items should flow the same as incomplete ones."""
    item = make_item(time_unit="today", completed=True)
    update, transition = _compute_normal_update(item, PLAIN_DAY, NOW_ISO)
    assert update["time_unit"] == "week"
    assert transition == "today_to_week"


def test_week_flows_to_month_on_monday():
    item = make_item(time_unit="week", flow_count=1, days_in_unit=3)
    update, transition = _compute_normal_update(item, A_MONDAY, NOW_ISO)
    assert update["time_unit"] == "month"
    assert update["flow_count"] == 2
    assert update["days_in_unit"] == 0
    assert transition == "week_to_month"


def test_week_stays_on_non_monday():
    item = make_item(time_unit="week", days_in_unit=2)
    update, transition = _compute_normal_update(item, PLAIN_DAY, NOW_ISO)
    assert update["time_unit"] == "week"
    assert update["days_in_unit"] == 3
    assert transition is None


def test_month_flows_to_season_on_first():
    item = make_item(time_unit="month", days_in_unit=5)
    update, transition = _compute_normal_update(item, A_FIRST_NON_SEASON, NOW_ISO)
    assert update["time_unit"] == "season"
    assert update["flow_count"] == 1
    assert transition == "month_to_season"


def test_month_stays_on_non_first():
    item = make_item(time_unit="month", days_in_unit=10)
    update, transition = _compute_normal_update(item, PLAIN_DAY, NOW_ISO)
    assert update["time_unit"] == "month"
    assert update["days_in_unit"] == 11
    assert transition is None


def test_season_flows_to_year_on_season_start():
    item = make_item(time_unit="season")
    update, transition = _compute_normal_update(item, SEASON_START, NOW_ISO)
    assert update["time_unit"] == "year"
    assert update["flow_count"] == 1
    assert transition == "season_to_year"


def test_season_stays_on_non_season_start():
    item = make_item(time_unit="season", days_in_unit=7)
    update, transition = _compute_normal_update(item, PLAIN_DAY, NOW_ISO)
    assert update["time_unit"] == "season"
    assert update["days_in_unit"] == 8
    assert transition is None


def test_year_always_stays():
    item = make_item(time_unit="year")
    update, transition = _compute_normal_update(item, PLAIN_DAY, NOW_ISO)
    assert update["time_unit"] == "year"
    assert transition is None


def test_multi_year_always_stays():
    item = make_item(time_unit="multi_year")
    update, transition = _compute_normal_update(item, PLAIN_DAY, NOW_ISO)
    assert update["time_unit"] == "multi_year"
    assert transition is None


def test_normal_update_preserves_completion_count():
    item = make_item(time_unit="today", completion_count=5)
    update, _ = _compute_normal_update(item, PLAIN_DAY, NOW_ISO)
    assert update["completion_count"] == 5


def test_normal_update_sets_updated_at():
    item = make_item(time_unit="today")
    update, _ = _compute_normal_update(item, PLAIN_DAY, "sentinel-ts")
    assert update["updated_at"] == "sentinel-ts"


# ---------------------------------------------------------------------------
# _compute_maintenance_update — result dict shape and return type
# ---------------------------------------------------------------------------


def test_maintenance_update_dict_always_has_required_keys():
    required = {"id", "user_id", "title", "time_unit", "flow_count", "completion_count", "days_in_unit", "updated_at"}
    item = make_item(time_unit="week", do_type="maintenance")
    update, _ = _compute_maintenance_update(item, PLAIN_DAY, NOW_ISO)
    assert required == set(update.keys())


def test_maintenance_update_returns_tuple():
    item = make_item(time_unit="today", do_type="maintenance")
    result = _compute_maintenance_update(item, PLAIN_DAY, NOW_ISO)
    assert isinstance(result, tuple) and len(result) == 2


# ---------------------------------------------------------------------------
# _compute_maintenance_update — flow rules (same triggers as normal dos)
# ---------------------------------------------------------------------------


def test_maintenance_today_flows_to_week():
    """today maintenance dos flow to week every day, resetting completion_count."""
    item = make_item(time_unit="today", do_type="maintenance", completion_count=2, flow_count=0)
    update, transition = _compute_maintenance_update(item, PLAIN_DAY, NOW_ISO)
    assert update["time_unit"] == "week"
    assert update["flow_count"] == 1
    assert update["completion_count"] == 0
    assert update["days_in_unit"] == 0
    assert transition == "today_to_week"


def test_maintenance_week_flows_to_month_on_monday():
    """week maintenance dos flow to month on Mondays, resetting completion_count."""
    item = make_item(time_unit="week", do_type="maintenance", completion_count=4, flow_count=1)
    update, transition = _compute_maintenance_update(item, A_MONDAY, NOW_ISO)
    assert update["time_unit"] == "month"
    assert update["flow_count"] == 2
    assert update["completion_count"] == 0
    assert update["days_in_unit"] == 0
    assert transition == "week_to_month"


def test_maintenance_week_stays_on_non_monday():
    """On a plain day a week maintenance do stays and preserves its count."""
    item = make_item(time_unit="week", do_type="maintenance", completion_count=2, days_in_unit=3)
    update, transition = _compute_maintenance_update(item, PLAIN_DAY, NOW_ISO)
    assert update["time_unit"] == "week"
    assert update["completion_count"] == 2
    assert update["days_in_unit"] == 4
    assert transition is None


def test_maintenance_month_flows_to_season_on_first():
    item = make_item(time_unit="month", do_type="maintenance", completion_count=10)
    update, transition = _compute_maintenance_update(item, A_FIRST_NON_SEASON, NOW_ISO)
    assert update["time_unit"] == "season"
    assert update["completion_count"] == 0
    assert transition == "month_to_season"


def test_maintenance_season_flows_to_year_on_season_start():
    item = make_item(time_unit="season", do_type="maintenance", completion_count=8)
    update, transition = _compute_maintenance_update(item, SEASON_START, NOW_ISO)
    assert update["time_unit"] == "year"
    assert update["completion_count"] == 0
    assert transition == "season_to_year"


# ---------------------------------------------------------------------------
# _compute_maintenance_update — period resets for year/multi_year (no flow destination)
# ---------------------------------------------------------------------------


def test_maintenance_year_resets_on_new_year():
    """year has no flow destination, so a new year resets completion_count in place."""
    item = make_item(time_unit="year", do_type="maintenance", completion_count=12, days_in_unit=364)
    update, transition = _compute_maintenance_update(item, NEW_YEAR_NON_CYCLE, NOW_ISO)
    assert update["time_unit"] == "year"
    assert update["completion_count"] == 0
    assert update["days_in_unit"] == 0
    assert transition is None


def test_maintenance_multi_year_resets_on_cycle_new_year():
    item = make_item(time_unit="multi_year", do_type="maintenance", completion_count=6, days_in_unit=1000)
    update, transition = _compute_maintenance_update(item, NEW_YEAR_CYCLE, NOW_ISO)
    assert update["time_unit"] == "multi_year"
    assert update["completion_count"] == 0
    assert update["days_in_unit"] == 0
    assert transition is None


def test_maintenance_multi_year_does_not_reset_on_non_cycle_new_year():
    item = make_item(time_unit="multi_year", do_type="maintenance", completion_count=6, days_in_unit=100)
    update, transition = _compute_maintenance_update(item, NEW_YEAR_NON_CYCLE, NOW_ISO)
    assert update["completion_count"] == 6
    assert update["days_in_unit"] == 101
    assert transition is None


def test_maintenance_flow_count_unchanged_when_staying():
    """flow_count must not change when the task stays in its current unit."""
    item = make_item(time_unit="week", do_type="maintenance", flow_count=3)
    update, _ = _compute_maintenance_update(item, PLAIN_DAY, NOW_ISO)
    assert update["flow_count"] == 3
