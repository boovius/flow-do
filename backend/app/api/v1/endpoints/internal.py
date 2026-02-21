from fastapi import APIRouter, Header, HTTPException, status
from app.core.config import settings
from app.services.flow_up import run_flow_up

router = APIRouter()


@router.post("/flow-up")
def trigger_flow_up(x_cron_secret: str = Header(...)):
    """
    Manually trigger the flow-up job.
    Protected by X-Cron-Secret header — not a user JWT.
    Used by external cron services (Render, GitHub Actions, etc.)
    """
    if not settings.CRON_SECRET or x_cron_secret != settings.CRON_SECRET:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    summary = run_flow_up()
    return {"ok": True, "moved": summary}
