# Google Calendar Integration Analysis

## Recommended staged approach
1. Add Google OAuth configuration and backend callback flow
2. Persist Google Calendar connection data securely
3. Add backend endpoint to fetch today’s primary-calendar events
4. Add frontend connect/disconnect UI
5. Display today’s calendar events alongside Today dos
6. Explore calendar-aware Today layout
7. Later: drag dos into open calendar time sections

## Human-in-the-loop setup required
- create/select Google Cloud project
- enable Google Calendar API
- configure OAuth consent screen
- create OAuth client credentials
- register redirect URIs
- add Google OAuth env vars/secrets
- add test users if needed during development

## MVP recommendation
- read-only first
- primary calendar only
- today only
- simple event list / adjacent view before any drag/drop scheduling
