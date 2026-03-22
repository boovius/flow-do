from datetime import date

from pydantic import BaseModel


class GoogleCalendarEvent(BaseModel):
    id: str
    summary: str | None = None
    status: str | None = None
    html_link: str | None = None
    start: dict
    end: dict


class GoogleCalendarTodayEventsResponse(BaseModel):
    date: date
    events: list[GoogleCalendarEvent]
