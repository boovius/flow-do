FlowDo
=======

The app is called "Flow-Do"
It's like a Todo app with a kanban water-flow of:
  * 3-5 Year ->
  * Year ->
  * Season ->
  * Month ->
  * Week ->
  * Today.

## Core flow mechanism
Items from longer time frames frame the smaller time framed ones.
This is not a project management style application. It's really meant to be more like a ToDo app with a fluid flow dynamic between time.
I imagine the flow above is going to be split in 2 between long term building and more immediate task-crushing.
So we'd have like "vision" section of 3-5 Year->Year and then an "present" section of Season->Month->Week->Today.
The basic idea here is that we can view goals in 90 day chunks of time. Anymore than that and we humans lose context.
So Year and 3-5 Year and beyond are timeframes that become aspirational, nebulous, and hazy. These are our dreams and the general direction of our life. They are the why from which the seasonal what's spring.
The "present" section name may deserve some further workshopping. But it's a section of activity that is action-oriented in the present, project-managed, and scoped to a well-defined goal or milestone.
The basic "flow" of this goes that each unit is time dependent, and that whenever one unit's time expires, the tasks within it would "flow" back up to their next section.
Example: I have the task of "write mom birthday card" in my Today.
After Today ends (which would occur at the end of the day - perhaps a configurable time), if I hadn't marked that task as completed it would flow back up to the Week.
Each day is reprioritized anew, every day. Each week every week and so on and so on. Tasks that have flown back up, get marked as such with some UI indicator (color or style, etc.).
So within this core we have the two primary sections: "Vision" and "Present"
That is core mechanism and then there are 2 secondary mechanisms.

### Flow direction rules
- **Flow up (automatic):** When a time unit expires and a task is uncompleted, it automatically flows up to the next larger unit. This is triggered by a server-side cron job that runs daily. On a day rollover it processes Today -> Week. On a week rollover it processes Week -> Month. On a month rollover Month -> Season. On a season rollover Season -> Year. And so on.
- **Flow down (manual):** Users manually pull tasks from a larger time unit down into a smaller one (e.g. pull from Week into Today). This is the primary daily prioritization gesture.
- **Flow down (future / AI-assisted):** The architecture should anticipate an intelligent auto-flow-down feature. Each day a cron job could suggest or automatically assign tasks from the previous time unit into the current one, based on context, priority, and user history. This is a v2+ feature but the data model should support it.
- **Staleness tracking:** The system tracks how many days a task has spent in a given time unit without being completed. This data will be used for UI indicators (e.g. a task that has bounced back to Week 3 times looks different from a fresh one) and will feed future intelligence features.

### Vision items
Vision items (3-5 Year, Year) are completable and moveable like Present tasks, but carry additional attributes that reflect their deeper personal significance:
- **Why:** A freeform field capturing the personal meaning or motivation behind the item.
- **Core principles alignment:** Vision items may be tagged or linked to a user's defined core principles (e.g. "Family", "Health", "Creative growth"). Users should be able to define and reflect on these principles within the app.
- **Reflection prompts:** The UI may surface prompts to encourage the user to revisit and reflect on their Vision items periodically — connecting daily action back to long-term meaning.

Vision items do not flow up automatically in the same cadence as Present items (since Year and 3-5 Year units don't expire on a daily/weekly basis), but the flow-up mechanic may apply at year or multi-year boundaries.

## Secondary mechanisms
### Time blocks
This is a prioritization mechanism, blocking off chunks of time within a week.
The UI for this will look like a weekly calendar.
But all time-modes within the "Present" section should have views here: day, week, month, season.
The idea is that the user can easily block off fractions of the full unit, like creating events in calendar.
So a user may section of hours of a day within a day or week but would section off half-days when looking at a month and full-single-days when looking at a season.
Maybe time-blocks view is a secondary view of the primary flow-do view and users toggle between predefined blocks of time in a Unit and the items/tasks to do.

### Repeating items
Then there is the notion of repeating items. For instance, one wants to read 5 times a week or workout 4 times a week.
These repetitive tasks are different from Todo-tasks in that they cannot be completed. One just repeats them.
Again here like Time-blocks this will likely apply as another secondary view of the "Present" view.
Users define a repeating task and perhaps a goal for a day/week/month/season.
Whenever done, user can tap that item and it will count how many done within that time period.
When a time period resets (new day, new week, etc.), the completion count for that period resets to zero. However, all individual completion events are stored permanently — this historical data supports streaks, trends, and future analytics.
Weeks run Monday -> Sunday by default. This is user-configurable to any preferred start day.
Months will be 1 - end of month (28/30/31)

## UI / Visual design

### Present section layout
The Present section is a kanban-style board with four time-unit columns arranged left to right:

**Today → Week → Month → Season**

The board should feel like a living river — tasks cascade down from Season (the widest, most expansive view) into the most immediate unit (Today). The visual metaphor is water flowing: broad and slow at the Season level, narrower and faster as it approaches Today.

#### Default view (all at a glance)
All four columns are visible simultaneously at equal width. This gives the user a full read of their season from a single screen. Each column header shows:
- The unit name (Today / Week / Month / Season)
- The current date range for that unit (e.g. "Mon, Feb 19" / "Feb 16 – 22" / "February 2026" / "Winter 2026")

#### Zoom / focus mode
Clicking a column header expands it to dominate the layout. The other columns collapse to thin vertical strips showing only their title (rotated 90°, still tappable). Clicking the active column or any collapsed column switches focus. This transition should be smooth and animated — the fluidity of the animation IS the design.

The zoom mechanic is touch-friendly by design: tap to focus, tap again to collapse. This maps cleanly to a future mobile swipe gesture.

#### Visual language
- Elegant and minimal. Let whitespace and motion do the work.
- Subtle visual differentiation between columns (typography weight, muted tints) to convey temporal depth — Today feels present and immediate, Season feels expansive and ambient.
- Dividers between columns should feel soft, not harsh — the boundary between time units is permeable.
- Animation easing should feel fluid and organic, not mechanical.
- No clutter. Every pixel should earn its place.

### App sections (top-level navigation)
Two primary sections, accessible from the app header:
- **Present** — the 4-column flow board (Today / Week / Month / Season)
- **Vision** — 3-5 Year and Year goals with Why, core principles alignment (v1 scope, visual TBD)

## Scope
### v1
- Vision section (3-5 Year, Year) with completable/moveable items and extra attributes (Why, core principles)
- Present section (Season, Month, Week, Today) with task flow
- Automatic flow-up via cron job on time unit expiry
- Manual flow-down by user
- Staleness tracking (days spent in a unit without completion)
- UI indicators for flowed-up / stale tasks
- User authentication (JWT)
- Basic user settings (configurable end-of-day time, week start day)

### v2+
- Time blocks view
- Repeating items
- AI-assisted flow-down suggestions
- Core principles reflection prompts
- Streaks and analytics for repeating items

## Tech

### Stack
- **Backend:** FastAPI (Python)
- **Frontend:** TypeScript + React (Vite SPA)
- **Database:** Supabase (Postgres)
- **Auth:** Supabase Auth (JWT-based, no custom auth layer)
- **Server state / caching:** TanStack Query
- **UI components:** shadcn/ui + Tailwind CSS
- **Monorepo:** single repo with `frontend/` and `backend/` directories

### Deployment
- Local dev for now
- FastAPI -> Render
- Frontend -> Vercel
- Supabase hosted (managed Postgres + Auth)

### Mobile strategy
Web-first, but built with mobile in mind:
- UI patterns should reflect mobile conventions (touch targets, stack/tab navigation metaphors, minimal hover-dependent interactions)
- Business logic lives in hooks and TanStack Query — these port to React Native or can be re-implemented cleanly for native Swift/Kotlin
- UI components (shadcn/ui) will be rewritten for mobile; the seam between logic and presentation should be kept clean for this reason
- Target: React Native or native Swift/Kotlin in a future phase

### Architecture notes
- Cron jobs run server-side (FastAPI background scheduler or Render cron) to handle automatic flow-up at time unit expiry
- Supabase caching for a user's "Present" state on load; discrete item details fetched on demand
- Data model should anticipate AI-assisted flow-down (v2+): store task history, staleness counts, and user interaction patterns from day one

### Flow-up cron job implementation

The daily flow-up is implemented entirely in the Python API layer — no stored procedures. This keeps business logic in one place (version-controlled Python), easy to test, and easy to extend.

**Schedule**
APScheduler (`BackgroundScheduler`) runs `run_flow_up()` daily at 00:00 UTC inside the FastAPI process lifespan. For production on Render, the same endpoint can be hit by an external cron service.

**External trigger**
`POST /api/v1/internal/flow-up` — protected by an `X-Cron-Secret` header (not a user JWT). This lets Render cron, GitHub Actions, or any external scheduler trigger the job independently of the in-process scheduler. The secret is set via the `CRON_SECRET` environment variable.

**Python logic (in `backend/app/services/flow_up.py`)**
1. Fetch all uncompleted dos (id, time_unit, days_in_unit, flow_count) in one query.
2. Evaluate today's UTC date to determine which transitions are active:
   - `today → week` — every day
   - `week → month` — Mondays only (ISO day-of-week = 1)
   - `month → season` — 1st of each month
   - `season → year` — season starts only (Mar 1, Jun 1, Sep 1, Dec 1)
3. For each item, compute its new state in Python:
   - Flowing item: new `time_unit`, `flow_count + 1`, `days_in_unit = 0`
   - Non-flowing item: `days_in_unit + 1`
4. Batch-upsert all changes in a single Supabase call.
5. Return a summary dict (`{"today_to_week": N, "week_to_month": N, ...}`) for logging and the HTTP response.

**Why Python, not a stored procedure?**
Business logic in the database is hard to test, invisible to code review, and requires a migration to change. Keeping it in Python means the rules live alongside every other piece of application logic, can be unit-tested with mocks, and are just a file edit away from modification.
