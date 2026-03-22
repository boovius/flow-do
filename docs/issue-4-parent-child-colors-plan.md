# Issue #4 Plan — Color-Coordinate Parents and Children Automatically

## Issue
#4 — Color-coordinate parents and children automatically

## Goal
Make parent/child relationships easier to parse at a glance by giving related dos a shared muted background color.

---

## Product Intent
When a parent/child relationship is created:
- related items should share a visible but not overwhelming color treatment
- the color should help users visually scan patterns across the board
- the color should feel informative, not loud or chaotic

Important behavior:
- if a parent already has a color, a newly linked child should inherit that parent color
- if a new child is created under a colored parent, the child should inherit the parent color
- if two previously uncolored items are linked, they should receive a new shared color
- future enhancement may allow manual override via hex code entry or a color picker

---

## Proposed First-Pass Implementation

## Data model
Add a nullable color field to dos.

### Proposed field
- `color_hex` (nullable text)

Why store it:
- preserves relationship color across sessions and devices
- enables inheritance behavior server-side
- supports future manual editing
- keeps the UI simple and deterministic

---

## Backend behavior

### On create_do with parent_id
- if the parent already has `color_hex`, assign that color to the new child
- if parent has no color, generate a muted color and apply it to both parent and child

### On update_do when setting parent_id
- if parent has a color, assign that color to the child
- if child has a color and parent does not, consider promoting the child color to the parent for shared consistency
- if neither has a color, generate a new shared color and apply it to both

### On unlink
First pass recommendation:
- do **not** remove existing colors automatically
- keep unlink behavior simple for now

Reason:
- removing colors cleanly is more complex if a parent has multiple children or the color has already spread through a larger relationship graph
- we can revisit color recomputation later if needed

---

## Color generation strategy
First pass should use a curated palette of muted-but-distinct colors rather than fully random arbitrary hex values.

Why:
- easier to keep the UI readable
- reduces risk of ugly/low-contrast/randomly harsh colors
- still feels effectively random from the user’s point of view

Possible approach:
- maintain a small palette of 8–12 colors
- choose one when a new shared lineage color is needed

Desired qualities:
- distinguishable from the app background
- slightly soft / translucent in rendered appearance
- not too saturated

---

## Frontend behavior

### Rendering
- if a do has `color_hex`, render its card with a tinted background
- apply opacity in presentation so the stored hex can stay simple
- preserve readability of text and icons

### Priority interaction
If a do is marked as today-priority, ensure the priority styling still remains legible.

Possible first-pass behavior:
- keep priority border/star treatment
- let background color remain lightly tinted underneath

---

## Scope for this first pass
Included:
- schema/data model support for `color_hex`
- server-side inheritance/shared-color assignment on create/link
- frontend card tint rendering

Deferred:
- manual editing of colors
- color picker UI
- recomputing colors across whole trees on unlink/reparent edge cases
- advanced accessibility tuning of all palette combinations

---

## Acceptance Criteria
- dos can store a nullable `color_hex`
- linking a child to a colored parent gives the child the same color
- creating a child under a colored parent gives the child the same color
- linking two uncolored items assigns a new shared color to both
- linked items render with a visible but muted shared background tint
- UI remains readable and not overly saturated

---

## Risks / Edge Cases
- unlink behavior may leave colors behind after relationships change
- reparenting across differently colored trees may need more explicit rules later
- very large hierarchies may eventually want tree-wide normalization logic
- muted colors still need reasonable contrast with existing text/icon palette

---

## Recommended First Pass Rule Set
Use these simple rules first:
1. if parent has color → child inherits parent color
2. else if child has color → parent inherits child color
3. else generate a new shared color and apply it to both
4. do not auto-remove colors on unlink

This keeps implementation understandable while delivering the main UX value.

---

## Suggested Follow-Up After First Pass
- add manual hex-code override option
- decide whether colors should propagate to all descendants recursively
- add screenshot-based UI review once tooling is ready
- refine palette based on real usage

---

Prepared for issue #4 implementation.