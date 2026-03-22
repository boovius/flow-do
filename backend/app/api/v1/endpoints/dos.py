from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth import get_current_user
from app.core.supabase import supabase
from app.schemas.dos import Do, DoCreate, DoUpdate, TimeUnit, DoType
from app.services.maintenance import get_count, inject_counts
from app.services.lineage_colors import assign_shared_color_for_parent_child

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
    dos_data = result.data or []
    inject_counts(dos_data, datetime.now(timezone.utc))
    today_str = datetime.now(timezone.utc).date().isoformat()
    for d in dos_data:
        d["is_today_priority"] = (d.get("priority_date") == today_str)
    return dos_data


@router.post("", response_model=Do, status_code=status.HTTP_201_CREATED)
async def create_do(
    payload: DoCreate,
    current_user: dict = Depends(get_current_user),
):
    user_id = _user_id(current_user)

    insert_data: dict = {
        "user_id": user_id,
        "title": payload.title,
        "time_unit": payload.time_unit.value,
        "do_type": payload.do_type.value,
    }
    if payload.color_hex is not None:
        insert_data["color_hex"] = payload.color_hex
    if payload.parent_id is not None:
        insert_data["parent_id"] = str(payload.parent_id)

    result = supabase.table("dos").insert(insert_data).execute()
    created = result.data[0]

    if payload.parent_id is not None:
        try:
            shared_color = assign_shared_color_for_parent_child(
                parent_id=str(payload.parent_id),
                child_id=str(created["id"]),
                user_id=user_id,
                child_color_hex=created.get("color_hex"),
            )
            created["color_hex"] = shared_color
        except ValueError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent do not found")

    return created


@router.patch("/{do_id}", response_model=Do)
async def update_do(
    do_id: str,
    payload: DoUpdate,
    current_user: dict = Depends(get_current_user),
):
    # Verify ownership before updating
    existing = (
        supabase.table("dos")
        .select("id,color_hex")
        .eq("id", do_id)
        .eq("user_id", _user_id(current_user))
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Do not found")

    updates = payload.model_dump(exclude_unset=True)
    if "completed_at" in updates and updates["completed_at"] is not None:
        updates["completed_at"] = updates["completed_at"].isoformat()
    if "time_unit" in updates:
        updates["time_unit"] = updates["time_unit"].value
        if payload.time_unit != TimeUnit.today:
            updates["priority_date"] = None
    link_parent_id: str | None = None
    link_child_color: str | None = None
    if "parent_id" in updates:
        if updates["parent_id"] is not None:
            link_parent_id = str(updates["parent_id"])
            link_child_color = updates.get("color_hex", existing.data[0].get("color_hex"))
            updates["parent_id"] = link_parent_id
        # None is left as None to unset the parent_id

    result = supabase.table("dos").update(updates).eq("id", do_id).execute()
    do = result.data[0]

    if link_parent_id is not None:
        try:
            shared_color = assign_shared_color_for_parent_child(
                parent_id=link_parent_id,
                child_id=do_id,
                user_id=_user_id(current_user),
                child_color_hex=link_child_color,
            )
            do["color_hex"] = shared_color
        except ValueError:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parent do not found")
    do = result.data[0]
    if do["do_type"] == DoType.maintenance.value:
        do["completion_count"] = get_count(do["id"], do["time_unit"], datetime.now(timezone.utc))
    today_str = datetime.now(timezone.utc).date().isoformat()
    do["is_today_priority"] = (do.get("priority_date") == today_str)
    return do


@router.post("/{do_id}/log", response_model=Do)
async def log_maintenance_do(
    do_id: str,
    current_user: dict = Depends(get_current_user),
):
    existing = (
        supabase.table("dos")
        .select("id,do_type")
        .eq("id", do_id)
        .eq("user_id", _user_id(current_user))
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Do not found")
    if existing.data[0]["do_type"] != DoType.maintenance.value:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only maintenance dos can be logged")

    supabase.table("maintenance_logs").insert({
        "do_id": do_id,
        "user_id": _user_id(current_user),
    }).execute()

    do = supabase.table("dos").select("*").eq("id", do_id).execute().data[0]
    do["completion_count"] = get_count(do_id, do["time_unit"], datetime.now(timezone.utc))
    return do


@router.post("/{do_id}/toggle-priority", response_model=Do)
async def toggle_priority(
    do_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = _user_id(current_user)
    existing = (
        supabase.table("dos")
        .select("*")
        .eq("id", do_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Do not found")

    do_row = existing.data[0]
    today_str = datetime.now(timezone.utc).date().isoformat()

    if do_row.get("priority_date") == today_str:
        # Toggle off
        result = supabase.table("dos").update({"priority_date": None}).eq("id", do_id).execute()
    else:
        # Clear any existing today-priority for this user, then set this one
        supabase.table("dos").update({"priority_date": None}).eq("user_id", user_id).eq("priority_date", today_str).execute()
        result = supabase.table("dos").update({"priority_date": today_str}).eq("id", do_id).execute()

    do = result.data[0]
    inject_counts([do], datetime.now(timezone.utc))
    do["is_today_priority"] = (do.get("priority_date") == today_str)
    return do


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
