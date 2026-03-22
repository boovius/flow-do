# Google Calendar Setup Checklist

## Purpose
Human-in-the-loop setup required before Flow-Do can complete Google Calendar OAuth locally or in production.

---

## Google Cloud setup
- [ ] Create or choose a Google Cloud project
- [ ] Enable the **Google Calendar API**
- [ ] Configure the **OAuth consent screen**
- [ ] Add Josh as a test user if the app is in testing mode
- [ ] Create an OAuth client ID / client secret

---

## Redirect URIs
Register the exact backend callback URI(s) that Flow-Do will use.

### Likely examples
- local: `http://localhost:8000/api/v1/integrations/google-calendar/callback`
- production: `https://<your-backend-domain>/api/v1/integrations/google-calendar/callback`

---

## Backend env vars needed
Add these to the backend environment:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `GOOGLE_OAUTH_STATE_SECRET`

Suggested state secret generation:
```bash
openssl rand -hex 32
```

---

## Notes
- This first implementation only verifies OAuth and callback flow.
- Persistent connection storage is handled in issue #19.
- Read-only event fetching is handled in issue #20.
