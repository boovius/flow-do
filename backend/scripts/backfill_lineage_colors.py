#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.supabase import supabase  # noqa: E402
from app.services.lineage_colors import assign_shared_color_for_parent_child  # noqa: E402


def main() -> None:
    result = supabase.table("dos").select("id,user_id,parent_id,color_hex").not_.is_("parent_id", "null").execute()
    rows = result.data or []

    updated = 0
    skipped = 0

    for row in rows:
        parent_id = row.get("parent_id")
        user_id = row.get("user_id")
        child_id = row.get("id")
        if not parent_id or not user_id or not child_id:
            skipped += 1
            continue

        try:
            assign_shared_color_for_parent_child(
                parent_id=str(parent_id),
                child_id=str(child_id),
                user_id=str(user_id),
                child_color_hex=row.get("color_hex"),
            )
            updated += 1
        except ValueError:
            skipped += 1

    print(f"Processed linked dos: {len(rows)}")
    print(f"Updated lineage colors: {updated}")
    print(f"Skipped: {skipped}")


if __name__ == "__main__":
    main()
