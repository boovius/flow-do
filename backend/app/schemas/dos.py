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


class DoType(str, Enum):
    normal = "normal"
    maintenance = "maintenance"


class DoCreate(BaseModel):
    title: str
    time_unit: TimeUnit
    do_type: DoType = DoType.normal
    parent_id: uuid.UUID | None = None


class DoUpdate(BaseModel):
    title: str | None = None
    completed: bool | None = None
    completed_at: datetime | None = None
    time_unit: TimeUnit | None = None
    parent_id: uuid.UUID | None = None


class Do(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    time_unit: TimeUnit
    do_type: DoType
    completed: bool
    completed_at: datetime | None
    days_in_unit: int
    flow_count: int
    completion_count: int
    created_at: datetime
    updated_at: datetime
    parent_id: uuid.UUID | None = None
