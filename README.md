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

| Variable | Where to find it | What it's for |
|---|---|---|
| `SUPABASE_URL` | Settings → API → "Project URL" | The base URL of your Supabase project |
| `SUPABASE_ANON_KEY` | Settings → API → "Project API keys → anon / public" | Public key used by the browser. Safe to expose. Access is controlled by Row Level Security policies on your tables. |
| `SUPABASE_SERVICE_KEY` | Settings → API → "Project API keys → service_role" | Superuser key that bypasses all security rules. **Backend only — never expose this to the browser.** |

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

## Tech stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| Frontend | React 18, TypeScript, Vite |
| UI components | shadcn/ui + Tailwind CSS v4 |
| Server state | TanStack Query |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth (JWT verified via `auth.get_user`) |
| Deployment (planned) | Render (backend), Vercel (frontend) |
