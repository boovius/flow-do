from datetime import datetime

from pydantic import BaseModel


class GoogleCalendarConnectionStatus(BaseModel):
    connected: bool
    google_email: str | None = None
    scope: str | None = None
    token_type: str | None = None
    expires_at: datetime | None = None
