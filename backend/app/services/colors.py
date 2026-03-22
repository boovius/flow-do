from __future__ import annotations

import random

MUTED_LINEAGE_COLORS = [
    "#AFC6E9",  # dusty blue
    "#B7DDB0",  # soft green
    "#E8C39E",  # muted apricot
    "#D4B6E6",  # soft violet
    "#E7B5BF",  # dusty rose
    "#B9D9D3",  # muted teal
    "#D9C8A9",  # warm sand
    "#C7C6E8",  # lavender slate
    "#CFE2B3",  # moss tint
    "#E3C2B0",  # clay blush
]


def generate_lineage_color() -> str:
    """Return a readable muted lineage color hex string."""
    return random.choice(MUTED_LINEAGE_COLORS)


def resolve_shared_lineage_color(parent_color: str | None, child_color: str | None) -> str:
    """
    Choose a shared color for a parent/child relationship.

    Rule order:
    1. if parent already has a color, use it
    2. else if child already has a color, use it
    3. else generate a new muted color
    """
    return parent_color or child_color or generate_lineage_color()
