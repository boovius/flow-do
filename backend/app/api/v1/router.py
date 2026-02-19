from fastapi import APIRouter
from app.api.v1.endpoints import health, users, dos

router = APIRouter()

router.include_router(health.router, prefix="/health", tags=["health"])
router.include_router(users.router, prefix="/users", tags=["users"])
router.include_router(dos.router, prefix="/dos", tags=["dos"])
