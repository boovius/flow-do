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
