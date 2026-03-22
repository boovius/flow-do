from __future__ import annotations

from app.core.supabase import supabase
from app.services.colors import resolve_shared_lineage_color


def _load_user_dos(user_id: str) -> list[dict]:
    result = supabase.table("dos").select("id,parent_id,color_hex").eq("user_id", user_id).execute()
    return result.data or []


def _connected_lineage_ids(*, all_dos: list[dict], start_id: str) -> set[str]:
    by_id = {str(d["id"]): d for d in all_dos}
    children_by_parent: dict[str, list[str]] = {}
    for d in all_dos:
        parent_id = d.get("parent_id")
        if parent_id is not None:
            children_by_parent.setdefault(str(parent_id), []).append(str(d["id"]))

    visited: set[str] = set()
    stack = [start_id]

    while stack:
        current_id = stack.pop()
        if current_id in visited:
            continue
        visited.add(current_id)

        current = by_id.get(current_id)
        if current and current.get("parent_id") is not None:
            stack.append(str(current["parent_id"]))

        for child_id in children_by_parent.get(current_id, []):
            stack.append(child_id)

    return visited


def assign_color_to_lineage_chain(*, start_do_id: str, user_id: str, color_hex: str) -> str:
    """Apply a shared color to the connected parent/child lineage containing start_do_id."""
    all_dos = _load_user_dos(user_id)
    connected_ids = _connected_lineage_ids(all_dos=all_dos, start_id=start_do_id)
    if not connected_ids:
        raise ValueError("Do not found")

    supabase.table("dos").update({"color_hex": color_hex}).in_("id", list(connected_ids)).eq("user_id", user_id).execute()
    return color_hex


def assign_shared_color_for_parent_child(*, parent_id: str, child_id: str, user_id: str, child_color_hex: str | None = None) -> str:
    """
    Ensure a parent/child pair shares a lineage color and persist it across the connected chain.

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

    return assign_color_to_lineage_chain(start_do_id=child_id, user_id=user_id, color_hex=shared_color)
