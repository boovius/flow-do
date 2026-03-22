from fastapi import APIRouter
from app.api.v1.endpoints import health, users, dos, internal, google_calendar

router = APIRouter()

router.include_router(health.router, prefix="/health", tags=["health"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(dos.router, prefix="/dos", tags=["dos"])
router.include_router(internal.router, prefix="/internal", tags=["internal"])
router.include_router(google_calendar.router, prefix="/integrations/google-calendar", tags=["google-calendar"])
