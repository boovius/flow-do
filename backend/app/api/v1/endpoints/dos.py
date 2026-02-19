from fastapi import APIRouter, Depends, HTTPException, status
from app.middleware.auth import get_current_user
from app.core.supabase import supabase
from app.schemas.dos import Do, DoCreate, DoUpdate, TimeUnit

router = APIRouter()


def _user_id(current_user: dict) -> str:
    return current_user["sub"]


@router.get("", response_model=list[Do])
async def list_dos(
    time_unit: TimeUnit | None = None,
    current_user: dict = Depends(get_current_user),
):
    query = supabase.table("dos").select("*").eq("user_id", _user_id(current_user))
    if time_unit:
        query = query.eq("time_unit", time_unit.value)
    query = query.order("created_at", desc=False)
    result = query.execute()
    return result.data


@router.post("", response_model=Do, status_code=status.HTTP_201_CREATED)
async def create_do(
    payload: DoCreate,
    current_user: dict = Depends(get_current_user),
):
    result = supabase.table("dos").insert(
        {
            "user_id": _user_id(current_user),
            "title": payload.title,
            "time_unit": payload.time_unit.value,
        }
    ).execute()
    return result.data[0]


@router.patch("/{do_id}", response_model=Do)
async def update_do(
    do_id: str,
    payload: DoUpdate,
    current_user: dict = Depends(get_current_user),
):
    # Verify ownership before updating
    existing = (
        supabase.table("dos")
        .select("id")
        .eq("id", do_id)
        .eq("user_id", _user_id(current_user))
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Do not found")

    updates = payload.model_dump(exclude_none=True)
    if "completed_at" in updates and updates["completed_at"] is not None:
        updates["completed_at"] = updates["completed_at"].isoformat()
    if "time_unit" in updates:
        updates["time_unit"] = updates["time_unit"].value

    result = supabase.table("dos").update(updates).eq("id", do_id).execute()
    return result.data[0]


@router.delete("/{do_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_do(
    do_id: str,
    current_user: dict = Depends(get_current_user),
):
    existing = (
        supabase.table("dos")
        .select("id")
        .eq("id", do_id)
        .eq("user_id", _user_id(current_user))
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Do not found")

    supabase.table("dos").delete().eq("id", do_id).execute()
