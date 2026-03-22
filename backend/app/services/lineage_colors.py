from __future__ import annotations

from app.core.supabase import supabase
from app.services.colors import resolve_shared_lineage_color


def assign_shared_color_for_parent_child(*, parent_id: str, child_id: str, user_id: str, child_color_hex: str | None = None) -> str:
    """
    Ensure a parent/child pair shares a lineage color and persist it.

    Rules:
    1. if parent already has a color, child inherits parent color
    2. else if child already has a color, parent inherits child color
    3. else generate a new shared color for both

    Returns the shared color hex.
    """
    parent_result = (
        supabase.table("dos")
        .select("id,color_hex")
        .eq("id", parent_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not parent_result.data:
        raise ValueError("Parent do not found")

    child_result = (
        supabase.table("dos")
        .select("id,color_hex")
        .eq("id", child_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not child_result.data:
        raise ValueError("Child do not found")

    parent = parent_result.data[0]
    child = child_result.data[0]

    shared_color = resolve_shared_lineage_color(
        parent.get("color_hex"),
        child_color_hex or child.get("color_hex"),
    )

    if parent.get("color_hex") != shared_color:
        supabase.table("dos").update({"color_hex": shared_color}).eq("id", parent_id).execute()

    if child.get("color_hex") != shared_color:
        supabase.table("dos").update({"color_hex": shared_color}).eq("id", child_id).execute()

    return shared_color
