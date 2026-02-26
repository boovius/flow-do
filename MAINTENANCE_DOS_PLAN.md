# Plan: Maintenance Dos

> **Implementation note:** The approach below (immutable `maintenance_logs` table, computed counts) was the original plan but was **not built**. The actual implementation uses a simpler model:
>
> - `completion_count` is a mutable integer stored directly on the `dos` row (added in `20260221000000_add_maintenance_dos.sql`)
> - Maintenance dos **flow up** using the same time rules as normal dos (`today → week`, `week → month`, etc.)
> - When a maintenance do flows, `completion_count` resets to `0` — fresh tracking for the new time window
> - `year` and `multi_year` dos have no flow destination, so they reset `completion_count` in-place on period boundaries (Jan 1 for `year`; Jan 1 of years divisible by 3 for `multi_year`)
> - There is no `maintenance_logs` table; the `/log` endpoint was not added; `GET /dos` does not compute period counts
>
> See `backend/app/services/flow_up.py` (`_compute_maintenance_update`) and `backend/tests/test_flow_up.py` for the authoritative implementation.

---

## Original Plan (not implemented — kept for historical reference)

Users need a second type of "do" for recurring tasks that are never truly "finished" — things like exercise, watering plants, or a weekly review. Rather than checking them off, users log each occurrence. A separate `maintenance_logs` table stores every tap as an immutable timestamped row. The current-period count is **computed at query time** from those logs, never stored as a mutable integer.

User choices confirmed:
- **No count reset on drag** — count recalculates automatically from log history using the new `time_unit`'s period window
- **Tap whole row to log** — clicking anywhere on a maintenance do item logs one occurrence

---

## Why persisted logs instead of a mutable counter

| Approach | Pros | Cons |
|---|---|---|
| `completion_count` integer (original plan) | Simple | Lost on reset; wrong if flow-up misses midnight; can't recalculate after drag |
| `maintenance_logs` table (this plan) | Full history; drag recalculates correctly; no flow-up reset logic needed; "all time" stats free | Slightly more complex GET query |

Key wins:
- **Flow-up simplifies significantly** — no maintenance-specific reset branch needed at all
- **Drag just works** — `time_unit` changes, next GET recomputes count for the new period window
- **History is never lost** — foundation for future trend views

---

## Concerns & Inconsistencies Addressed

1. **N+1 query on GET /dos**: For each maintenance do, a count query runs against `maintenance_logs`. Acceptable for a personal app (tens of items max). An index on `(do_id, logged_at)` keeps each query fast. Can batch with a GROUP BY later if needed.

2. **Period window computation**: A new `get_period_window(unit, now)` helper in the backend returns `(start, end)` datetimes for any time unit. This replaces the reset-timing logic that was previously in flow-up.

3. **`completion_count` on the `Do` schema**: Still present as a response field, but it's a computed value injected by the API — not a column on the `dos` table.

4. **Tap-to-log vs. drag conflict**: DnD Kit's TouchSensor has a 200 ms / 5 px activation constraint. A quick tap won't trigger a drag. Drag handle and delete button use `stopPropagation`.

5. **`completed` field for maintenance dos**: Always `false`. Checkbox not rendered.

6. **Period label copy**: `today → "today"`, `week → "this week"`, `month → "this month"`, `season → "this season"`, `year → "this year"`, `multi_year → "this cycle"`.

7. **RLS on `maintenance_logs`**: Backend uses the service key (bypasses RLS), so add permissive policies as a safety net in case direct DB access is ever added.

8. **ON DELETE CASCADE**: Deleting a `do` cascades to its logs — no orphaned rows.

---

## Changes

### 1. Database migration

New file: `supabase/migrations/YYYYMMDDHHMMSS_add_maintenance_dos.sql`

```sql
-- Enum for do type
CREATE TYPE do_type AS ENUM ('normal', 'maintenance');

-- Add do_type to dos (no completion_count column — that's computed)
ALTER TABLE dos
  ADD COLUMN do_type do_type NOT NULL DEFAULT 'normal';

-- Immutable log of every maintenance tap
CREATE TABLE maintenance_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  do_id      uuid        NOT NULL REFERENCES dos(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id),
  logged_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON maintenance_logs (do_id, logged_at);

-- RLS (backend uses service key, but good practice)
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own logs"
  ON maintenance_logs FOR ALL
  USING (auth.uid() = user_id);
```

Run `supabase db push` before deploying.

---

### 2. `backend/app/schemas/dos.py`

- Add `DoType(str, Enum)` with values `normal` / `maintenance`
- Add `do_type: DoType = DoType.normal` to `Do` and `DoCreate`
- Add `completion_count: int = 0` to `Do` (computed, not stored)

---

### 3. New `backend/app/services/period.py`

Utility used by both the dos endpoint and the log endpoint:

```python
def get_period_window(unit: str, now: datetime) -> tuple[datetime, datetime]:
    """
    Returns (period_start, period_end) in UTC for the current period
    of the given time_unit.
    """
    # today   → midnight..next midnight
    # week    → Monday 00:00..next Monday 00:00
    # month   → 1st 00:00..1st of next month 00:00
    # season  → meteorological season start..next season start
    # year    → Jan 1 00:00..next Jan 1 00:00
    # multi_year → 3-year cycle start..+3 years
```

---

### 4. `backend/app/api/v1/endpoints/dos.py`

**a) Update `list_dos`**: after fetching dos, for any maintenance items compute current-period count:

```python
now = datetime.now(timezone.utc)
for do in dos:
    if do["do_type"] == "maintenance":
        start, end = get_period_window(do["time_unit"], now)
        result = supabase.table("maintenance_logs")
            .select("id", count="exact")
            .eq("do_id", do["id"])
            .gte("logged_at", start.isoformat())
            .lt("logged_at", end.isoformat())
            .execute()
        do["completion_count"] = result.count or 0
    else:
        do["completion_count"] = 0
```

**b) Add `POST /{do_id}/log`**:

```python
@router.post("/{do_id}/log", response_model=Do)
async def log_maintenance_do(do_id, current_user):
    # 1. Verify ownership + do_type == 'maintenance'
    # 2. Insert row into maintenance_logs
    # 3. Re-fetch the do and compute completion_count for response
    # 4. Return updated Do
```

---

### 5. `backend/app/services/flow_up.py`

> **Not implemented as planned.** Maintenance dos are NOT excluded from flow-up. See the implementation note at the top of this file for the actual behavior.

---

### 6. `frontend/src/types/index.ts`

```ts
export type DoType = "normal" | "maintenance"

export interface Do {
  // existing fields...
  do_type: DoType
  completion_count: number   // computed by API, always present
}
```

---

### 7. `frontend/src/hooks/useDos.ts`

- Update `useCreateDo` payload to accept optional `do_type: DoType` (defaults to `"normal"`)
- Add `useLogMaintenance`:
  - `POST /api/v1/dos/{id}/log`
  - Optimistic update: `completion_count += 1` in cache
  - Rollback on error
  - Invalidate `["dos", timeUnit]` on settle

---

### 8. `frontend/src/lib/time.ts`

Add `getPeriodLabel(unit: TimeUnit): string`:

```ts
today      → "today"
week       → "this week"
month      → "this month"
season     → "this season"
year       → "this year"
multi_year → "this cycle"
```

---

### 9. `frontend/src/components/AddDoInput.tsx`

Add a small icon toggle:
- Normal: circle icon — default
- Maintenance: ↻ repeat icon
- Clicking cycles between the two; sent with the create payload

---

### 10. `frontend/src/components/DoItem.tsx`

Branch on `item.do_type`:

**Normal do** — unchanged.

**Maintenance do:**
- Whole `div`: `onClick={() => logMaintenance(item)}` + `cursor-pointer`
- Drag handle button: `onClick={e => e.stopPropagation()}`
- Delete button: `onClick={e => e.stopPropagation()}`
- Replace checkbox circle with ↻ icon (same size/position)
- Count badge (always visible): `{completion_count}× {getPeriodLabel(time_unit)}`
  e.g. `"3× this week"`

---

## Files to modify

| File | Change |
|---|---|
| `supabase/migrations/…_add_maintenance_dos.sql` | new — `do_type` on dos + `maintenance_logs` table |
| `backend/app/schemas/dos.py` | add DoType + `do_type` + computed `completion_count` |
| `backend/app/services/period.py` | new — `get_period_window()` helper |
| `backend/app/api/v1/endpoints/dos.py` | inject counts in list; add `/log` endpoint |
| `backend/app/services/flow_up.py` | filter to `do_type = 'normal'` only |
| `frontend/src/types/index.ts` | add DoType + 2 fields to Do |
| `frontend/src/hooks/useDos.ts` | update useCreateDo, add useLogMaintenance |
| `frontend/src/components/AddDoInput.tsx` | add type toggle |
| `frontend/src/components/DoItem.tsx` | branch rendering on do_type |
| `frontend/src/lib/time.ts` | add getPeriodLabel() |

---

## Verification

1. `supabase db push` — migration applies cleanly; `dos` has `do_type`, `maintenance_logs` table exists
2. Restart backend — `GET /api/v1/dos` returns `do_type` and `completion_count: 0` on all rows
3. Create a normal do → behaves exactly as before (checkbox, eligible for flow-up)
4. Create a maintenance do → row shows ↻ icon + "0× this week", no checkbox
5. Tap the maintenance row → count increments to 1, shows "1× this week"; row in `maintenance_logs` confirmed
6. Tap again → 2×
7. Drag the maintenance do to Month → shows "2× this month" if both taps were this month, otherwise lower — history recalculated correctly
8. Drag a normal do — still works, no count shown
9. Trigger flow-up → only normal dos affected; maintenance do stays in place, count unchanged
10. Delete a maintenance do → its `maintenance_logs` rows cascade-delete
