# Flow-Do

A time-aware todo app that flows tasks through time — from Today up through Week, Month, Season, Year, and multi-year Vision. Uncompleted tasks automatically flow back up to the next larger time unit at the end of each period. Users manually pull tasks down into the current period to prioritize.

## Project structure

```
flow-do/
├── backend/              # FastAPI (Python)
├── frontend/             # React + TypeScript (Vite)
├── supabase/
│   └── migrations/       # Versioned SQL migrations (Supabase CLI)
└── genesis.md            # Product brief and design decisions
```

## Prerequisites

- Python 3.11+
- Node 20+
- A [Supabase](https://supabase.com) project (free tier is fine)

## Supabase setup

Everything in this app — database, authentication, and JWT verification — runs through a single Supabase project. You'll need three values from it.

Go to your Supabase project → **Settings → API**:

> **Finding the Project URL:** It's labeled "Project URL" at the top of the Settings → API page. It looks like `https://abcdefghijklm.supabase.co`. You can also read the project ref from your browser's address bar when viewing the project — it's the random string in the URL.

| Variable                 | Where to find it                                       | What it's for                                                                                                       |
| ------------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`         | Settings → API → "Project URL"                       | The base URL of your Supabase project                                                                               |
| `SUPABASE_ANON_KEY`    | Settings → API → "Project API keys → anon / public" | Public key used by the browser. Safe to expose. Access is controlled by Row Level Security policies on your tables. |
| `SUPABASE_SERVICE_KEY` | Settings → API → "Project API keys → service_role"  | Superuser key that bypasses all security rules.**Backend only — never expose this to the browser.**          |

> **Note on the anon key:** The name is confusing — it doesn't mean "anonymous user". Think of it as the public client key. It's used both before login (for the sign-in/sign-up calls) and after (because the JWT itself carries the user's identity). What a user can do with it is controlled by Row Level Security rules on your database tables.

> **Note on JWT verification:** No JWT secret needed. The backend verifies tokens by calling `supabase.auth.get_user(token)` — Supabase validates the token server-side and returns the user. This works regardless of which signing key system your project uses.

## Local development

### 1. Backend

```bash
cd backend

# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and fill in your three Supabase values

# Start the dev server (runs on http://localhost:8000)
uvicorn app.main:app --reload
```

API docs are available at `http://localhost:8000/docs` once the server is running.

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env — you only need VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY here

# Start the dev server (runs on http://localhost:5173)
npm run dev
```

### Running both together

Open two terminal tabs — one for `backend/`, one for `frontend/`. The frontend expects the backend at `http://localhost:8000` by default (set via `VITE_API_URL` in `frontend/.env`).

## Environment variable reference

### `backend/.env`

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
ALLOWED_ORIGINS=http://localhost:5173
```

### `frontend/.env`

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
```

## Database migrations

Schema changes are tracked as versioned SQL files in `supabase/migrations/`. Each file is named `YYYYMMDDHHMMSS_description.sql` and applied in order.

### Setup (one time)

```bash
# Install the Supabase CLI
brew install supabase/tap/supabase   # macOS
# or: npm install -g supabase

# Log in and link to your hosted project
supabase login
supabase link --project-ref your-project-ref   # the ref from your Supabase URL
```

### Apply migrations to your hosted database

```bash
supabase db push
```

This runs any migration files that haven't been applied yet against your remote Postgres.

### Create a new migration

```bash
supabase migration new <description>
# e.g. supabase migration new add_vision_items
# Creates: supabase/migrations/YYYYMMDDHHMMSS_add_vision_items.sql
```

Write your SQL in the generated file, then run `supabase db push` to apply it.

> **First time only:** The initial migration (`20260220000000_create_dos.sql`) creates the `dos` table. If you already ran the old `schema.sql` manually in the SQL editor, `supabase db push` may report it as already applied or conflict — in that case you can mark it as applied with `supabase migration repair --status applied 20260220000000`.

## Authentication

### How it works

Authentication is split across two layers.

**Frontend — Supabase Auth client**

The user logs in via `supabase.auth.signInWithPassword()`. On success, Supabase returns a JWT (JSON Web Token) — a signed, self-contained string encoding the user's ID, email, and expiry. The Supabase JS client stores and refreshes this token automatically. Every outbound API request attaches it via an Axios request interceptor:

```
Authorization: Bearer <jwt>
```

**Backend — remote token verification**

On every authenticated endpoint, FastAPI's `get_current_user` dependency (`backend/app/middleware/auth.py`) takes the bearer token and calls:

```python
response = supabase.auth.get_user(token)
```

This makes an HTTP request to Supabase's auth service (`GET /auth/v1/user` with the token as the bearer). Supabase validates the token on their end — checking the signature, expiry, and that it was issued by this project — and returns the user object if valid. The dependency then extracts `user.id` and `user.email` for use in the endpoint.

### Why this approach (and the trade-off)

Supabase has been migrating between two JWT signing systems: an older symmetric scheme (HS256, using a shared secret) and a newer asymmetric scheme (RS256, using a public/private key pair). The transition means it's non-trivial to determine at setup time which algorithm a given project is using, making local cryptographic verification fragile.

Delegating validation to `supabase.auth.get_user()` sidesteps the problem entirely — Supabase always knows how it signed the token. It requires zero configuration beyond the Supabase URL and service key we already have.

The cost is latency: every authenticated API request makes an additional HTTP round-trip to Supabase's auth service (~50–150ms depending on network and region) before the actual work begins.

### Future: moving to local JWT verification

When it makes sense to optimise, the remote verification call can be replaced with local cryptographic signature checking. This eliminates the auth round-trip entirely. Items to consider when making that switch:

- **Determine the signing algorithm.** Check your Supabase project's JWT Keys settings (Settings → JWT Keys). New projects use RS256 (asymmetric); older projects may use HS256 (symmetric secret). The verification code must match.
- **For RS256 — use the JWKS endpoint.** Supabase exposes public keys at `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`. Use a library with JWKS support (e.g. `PyJWT` with `PyJWKClient`) to fetch and cache the public key, then verify the signature locally. Keys should be cached and refreshed on a schedule or on cache miss.
- **For HS256 — use the legacy JWT secret.** Available at Settings → JWT Keys → Legacy JWT Secret. Use `PyJWT` or `python-jose` with `algorithms=["HS256"]` and the secret as the key.
- **Validate all claims.** Whichever algorithm is used, explicitly verify: `aud` (should be `"authenticated"`), `exp` (not expired), and `iss` (matches your Supabase project URL). Don't just check the signature.
- **Cache the signing key.** For RS256, the JWKS fetch itself is a network call. Cache the key in process memory and refresh it only when a token's `kid` header doesn't match the cached key (i.e. after a key rotation). This avoids a network call on every request.
- **Handle key rotation.** Supabase may rotate signing keys. A request that fails signature verification with the cached key should trigger a JWKS refresh before being rejected, to avoid false 401s during a rotation event.
- **Keep the token expiry short.** Local verification has no way to honour server-side session revocation (e.g. a user who has been force-logged-out). Supabase's default access token expiry is 1 hour — consider whether that window is acceptable, or add a lightweight revocation check for sensitive endpoints.

## Flow-up cron job

### How time flow works

There are no per-item expiration timestamps. Flow is **structural**: the rule is purely based on what time unit an item is in and what day it is today. Every `today` item — completed or not — flows to `week` every night, no exceptions. This keeps the data model simple and the logic easy to reason about. Completed items continue to flow so that a task's history remains in the correct time-unit context rather than being stranded where it was finished.

| Item's current unit | Condition           | Flows to   |
| ------------------- | ------------------- | ---------- |
| `today`           | every day           | `week`   |
| `week`            | Mondays only        | `month`  |
| `month`           | 1st of each month   | `season` |
| `season`          | Mar/Jun/Sep/Dec 1st | `year`   |

These rules apply to **both** normal and maintenance dos. Items that flow get `flow_count + 1` and `days_in_unit` reset to 0. Items that stay accumulate `days_in_unit` as a staleness counter (used for future UI indicators).

### Maintenance dos and `completion_count`

Maintenance dos track how many times a recurring task has been done within its current time window using `completion_count` (stored on the `dos` row).

**When a maintenance do flows** to a higher time unit, `completion_count` resets to `0`. The new, larger window starts fresh — e.g. a weekly exercise do that flowed to month starts counting from zero for the month.

**When a maintenance do stays** in its unit, `completion_count` is left unchanged by flow-up — only user taps increment it.

**`year` and `multi_year` are special**: they have no higher destination to flow to, so they never leave their unit. Instead, `completion_count` resets in-place at period boundaries:
- `year`: resets on January 1st every year
- `multi_year`: resets on January 1st of years divisible by 3 (3-year cycle boundary)

### Implementation

All logic lives in **`backend/app/services/flow_up.py`** — no stored procedures. The function:

1. Fetches all dos in one query (completed and uncompleted alike)
2. Evaluates today's UTC date to determine which transitions are active
3. Computes each item's new state in Python
4. Applies all changes in a single batch upsert

> **Critical: keep all upsert dicts homogeneous.** PostgREST normalizes a batch of objects to the union of all keys present, filling `null` for any key missing from a given row. For the `ON CONFLICT (id) DO UPDATE` that follows, every column in the union becomes part of the `SET` clause — including `flow_count = null` or `completion_count = null` for rows where that key was omitted. This explicit `null` overrides the column's `DEFAULT 0` and hits the `NOT NULL` constraint. **Every dict in `updates` must include `flow_count` and `completion_count`**, even when the values are unchanged — pass `item["flow_count"]` / `item["completion_count"]` through as-is for those cases.

### Scheduler

APScheduler (`BackgroundScheduler`) runs `run_flow_up()` daily at **00:00 UTC** inside the FastAPI process. It starts and stops with the server via the FastAPI lifespan in `backend/app/main.py`. If the server is down at midnight, the job won't fire for that day — acceptable for local dev, something to address in production via the external trigger below.

### Manual trigger / external cron

```bash
curl -X POST http://localhost:8000/api/v1/internal/flow-up \
  -H "X-Cron-Secret: <your CRON_SECRET from backend/.env>"
```

This calls the exact same `run_flow_up()` function on demand. Useful for testing, and for production on Render where a separate Render Cron Job or GitHub Actions scheduled workflow can hit this endpoint independently of the in-process scheduler.

Set `CRON_SECRET` in `backend/.env` to any random string:

```bash
openssl rand -hex 32
```

## Deployment

The backend runs on **Render** (Python web service), the frontend on **Vercel** (static site). Both connect to the same Supabase project you already use for local development.

### Before you start

1. **Apply your database migrations** to the hosted Supabase database if you haven't yet:

   ```bash
   supabase db push
   ```
2. **Generate a `CRON_SECRET`** if you don't have one — you'll need it for the flow-up endpoint:

   ```bash
   openssl rand -hex 32
   ```

   Keep this value handy; you'll paste it into Render's environment variables.

---

### Step 1 — Deploy the backend to Render

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo and set **Root Directory** to `backend`
3. Render will auto-detect Python. Confirm these settings:
   | Setting                 | Value                                                |
   | ----------------------- | ---------------------------------------------------- |
   | **Runtime**       | Python 3                                             |
   | **Build command** | `pip install -r requirements.txt`                  |
   | **Start command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
4. Under **Environment Variables**, add:
   | Key                      | Value                                                           |
   | ------------------------ | --------------------------------------------------------------- |
   | `SUPABASE_URL`         | Your Supabase project URL                                       |
   | `SUPABASE_ANON_KEY`    | Your Supabase anon key                                          |
   | `SUPABASE_SERVICE_KEY` | Your Supabase service role key                                  |
   | `CRON_SECRET`          | The secret you generated above                                  |
   | `ALLOWED_ORIGINS`      | Leave blank for now — you'll fill this in after Vercel deploys |
5. Click **Create Web Service**. Once it's live, copy the URL (e.g. `https://flow-do-api.onrender.com`).

> **Free tier note:** Render's free tier spins the server down after 15 minutes of inactivity. The first request after sleep takes ~30–60 seconds. This also means the in-process midnight cron job won't fire while the server is asleep — see **Step 4** for the recommended fix.

---

### Step 2 — Deploy the frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import your GitHub repo and set **Root Directory** to `frontend`
3. Vercel will auto-detect Vite. Confirm these settings:
   | Setting                    | Value             |
   | -------------------------- | ----------------- |
   | **Framework Preset** | Vite              |
   | **Build command**    | `npm run build` |
   | **Output directory** | `dist`          |
4. Under **Environment Variables**, add:
   | Key                        | Value                                                                 |
   | -------------------------- | --------------------------------------------------------------------- |
   | `VITE_SUPABASE_URL`      | Your Supabase project URL                                             |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key                                                |
   | `VITE_API_URL`           | The Render URL from Step 1 (e.g.`https://flow-do-api.onrender.com`) |
5. Click **Deploy**. Once live, copy the Vercel URL (e.g. `https://flow-do.vercel.app`).

> **SPA routing:** `frontend/vercel.json` already includes a catch-all rewrite rule so that refreshing or directly visiting any URL returns `index.html` instead of a 404.

---

### Step 3 — Wire CORS

Now that you have the Vercel URL, go back to your Render service → **Environment** and set:

| Key                 | Value                                                   |
| ------------------- | ------------------------------------------------------- |
| `ALLOWED_ORIGINS` | `https://flow-do.vercel.app` (your actual Vercel URL) |

Render will redeploy automatically. Your frontend and backend are now connected.

---

### Step 4 — Reliable nightly flow-up (recommended)

The in-process APScheduler cron runs inside the FastAPI process — if the server is asleep at midnight it won't fire. The safest production approach is an **external trigger** on a schedule.

#### Option A — Render Cron Job (simplest)

1. In Render, **New → Cron Job**
2. Connect the same repo, root directory `backend`
3. Set:
   | Setting            | Value                                                                                     |
   | ------------------ | ----------------------------------------------------------------------------------------- |
   | **Schedule** | `0 0 * * *` (daily at 00:00 UTC)                                                        |
   | **Command**  | `curl -s -X POST $BACKEND_URL/api/v1/internal/flow-up -H "X-Cron-Secret: $CRON_SECRET"` |
4. Add `BACKEND_URL` and `CRON_SECRET` as environment variables on the cron job.

#### Option B — GitHub Actions

Create `.github/workflows/flow-up.yml`:

```yaml
name: Nightly flow-up
on:
  schedule:
    - cron: "0 0 * * *"   # 00:00 UTC daily
  workflow_dispatch:        # allow manual trigger

jobs:
  flow-up:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger flow-up
        run: |
          curl -s -X POST ${{ secrets.BACKEND_URL }}/api/v1/internal/flow-up \
            -H "X-Cron-Secret: ${{ secrets.CRON_SECRET }}"
```

Add `BACKEND_URL` and `CRON_SECRET` in your GitHub repo → **Settings → Secrets and variables → Actions**.

---

### Deployment environment variable reference

**Render (backend)**

| Variable                 | Value                                                |
| ------------------------ | ---------------------------------------------------- |
| `SUPABASE_URL`         | `https://your-project-ref.supabase.co`             |
| `SUPABASE_ANON_KEY`    | Supabase anon key                                    |
| `SUPABASE_SERVICE_KEY` | Supabase service role key                            |
| `ALLOWED_ORIGINS`      | Your Vercel URL (e.g.`https://flow-do.vercel.app`) |
| `CRON_SECRET`          | Random secret for the `/flow-up` endpoint          |

**Vercel (frontend)**

| Variable                   | Value                                                      |
| -------------------------- | ---------------------------------------------------------- |
| `VITE_SUPABASE_URL`      | `https://your-project-ref.supabase.co`                   |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key                                          |
| `VITE_API_URL`           | Your Render URL (e.g.`https://flow-do-api.onrender.com`) |

---

## Tech stack

| Layer                | Technology                                         |
| -------------------- | -------------------------------------------------- |
| Backend              | FastAPI (Python)                                   |
| Frontend             | React 18, TypeScript, Vite                         |
| UI components        | shadcn/ui + Tailwind CSS v4                        |
| Server state         | TanStack Query                                     |
| Database             | Supabase (Postgres)                                |
| Auth                 | Supabase Auth (JWT verified via `auth.get_user`) |
| Deployment (planned) | Render (backend), Vercel (frontend)                |
