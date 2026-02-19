# Flow-Do — Frontend

React + TypeScript frontend for Flow-Do. Built with Vite, shadcn/ui, Tailwind CSS v4, and TanStack Query.

See the [root README](../README.md) for full setup instructions and environment variable explanations.

## Quick start

```bash
npm install
cp .env.example .env   # fill in your Supabase URL and anon key
npm run dev            # http://localhost:5173
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase public/anon key (safe to expose in the browser) |
| `VITE_API_URL` | No | FastAPI backend URL. Defaults to `http://localhost:8000` |

## Structure

```
src/
├── components/
│   └── ui/          # shadcn/ui components (Button, Input, etc.)
├── hooks/
│   └── useAuth.ts   # Supabase session state and sign-out helper
├── lib/
│   ├── supabase.ts  # Supabase browser client
│   ├── api.ts       # Axios client — auto-attaches JWT to every request
│   └── utils.ts     # shadcn/ui utility (cn helper)
└── pages/
    ├── AuthPage.tsx      # Login / sign-up form
    └── DashboardPage.tsx # Main app shell (protected)
```
