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
from app.services.google_calendar_connections import (
    delete_google_calendar_connection,
    get_google_calendar_connection,
    upsert_google_calendar_connection,
)
from app.schemas.google_calendar import GoogleCalendarConnectionStatus

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


@router.get("/status", response_model=GoogleCalendarConnectionStatus)
async def google_calendar_status(current_user: dict = Depends(get_current_user)):
    connection = get_google_calendar_connection(user_id=current_user["sub"])
    if not connection:
        return GoogleCalendarConnectionStatus(connected=False)
    return GoogleCalendarConnectionStatus(
        connected=True,
        google_email=connection.get("google_email"),
        scope=connection.get("scope"),
        token_type=connection.get("token_type"),
        expires_at=connection.get("expires_at"),
    )


@router.post("/disconnect")
async def google_calendar_disconnect(current_user: dict = Depends(get_current_user)):
    delete_google_calendar_connection(user_id=current_user["sub"])
    return {"ok": True}


@router.get("/callback", response_class=HTMLResponse)
async def google_calendar_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
):
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
    upsert_google_calendar_connection(
        user_id=state_payload["user_id"],
        profile=profile,
        token_payload=token_payload,
    )

    html = f"""
    <html>
      <body style=\"font-family: sans-serif; padding: 24px;\">
        <h1>Google Calendar connected</h1>
        <p><strong>Status:</strong> OAuth callback succeeded and the connection was saved.</p>
        <p><strong>Google account:</strong> {profile.get('email', 'unknown')}</p>
        <p><strong>Flow-Do user:</strong> {state_payload.get('user_id')}</p>
        <p>You can return to Flow-Do and continue setup.</p>
      </body>
    </html>
    """
    return HTMLResponse(content=html)
