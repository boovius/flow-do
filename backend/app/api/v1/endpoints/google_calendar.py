from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse

from app.core.config import settings
from app.middleware.auth import get_current_user
from app.services.google_oauth import (
    build_google_auth_url,
    create_google_oauth_state,
    exchange_google_code,
    fetch_google_userinfo,
    google_oauth_configured,
    parse_google_oauth_state,
)

router = APIRouter()


@router.get("/connect")
async def google_calendar_connect(current_user: dict = Depends(get_current_user)):
    if not google_oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured",
        )

    state = create_google_oauth_state(user_id=current_user["sub"])
    return {"auth_url": build_google_auth_url(state=state)}


@router.get("/callback", response_class=HTMLResponse)
async def google_calendar_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
):
    """
    Handle the browser redirect back from Google OAuth.

    This returns a tiny HTML page on purpose because Google redirects a browser
    directly to this endpoint. At this stage, the simplest UX is to show a human-
    readable success/failure page after the token exchange completes.

    Later, once the frontend integration is fuller, this could instead redirect
    back into a dedicated frontend route with a more polished connected-state UX.
    """
    if error:
        return HTMLResponse(
            content=f"<html><body><h1>Google Calendar connection failed</h1><p>{error}</p></body></html>",
            status_code=400,
        )

    if not code or not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing OAuth code or state")

    try:
        state_payload = parse_google_oauth_state(state)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if not google_oauth_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured",
        )

    token_payload = await exchange_google_code(code=code)
    access_token = token_payload.get("access_token")
    if not access_token:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Google token exchange failed")

    profile = await fetch_google_userinfo(access_token=access_token)

    # Persistence is intentionally deferred to issue #19.
    html = f"""
    <html>
      <body style=\"font-family: sans-serif; padding: 24px;\">
        <h1>Google Calendar connection verified</h1>
        <p><strong>Status:</strong> OAuth callback succeeded.</p>
        <p><strong>Google account:</strong> {profile.get('email', 'unknown')}</p>
        <p><strong>Flow-Do user:</strong> {state_payload.get('user_id')}</p>
        <p>Token persistence and connected-state storage are handled in the next implementation step.</p>
      </body>
    </html>
    """
    return HTMLResponse(content=html)
