from pydantic import BaseModel
from enum import Enum
from datetime import datetime
import uuid


class TimeUnit(str, Enum):
    today = "today"
    week = "week"
    month = "month"
    season = "season"
    year = "year"
    multi_year = "multi_year"


class DoCreate(BaseModel):
    title: str
    time_unit: TimeUnit


class DoUpdate(BaseModel):
    title: str | None = None
    completed: bool | None = None
    completed_at: datetime | None = None
    time_unit: TimeUnit | None = None


class Do(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    time_unit: TimeUnit
    completed: bool
    completed_at: datetime | None
    days_in_unit: int
    flow_count: int
    created_at: datetime
    updated_at: datetime
