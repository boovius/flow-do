import type { Do } from "@/types"

/**
 * Walk parent_id links upward from id, return [parent, grandparent, ...]
 * Guards against cycles with a visited set.
 */
export function getAncestorChain(all: Do[], id: string): Do[] {
  const byId = new Map(all.map((d) => [d.id, d]))
  const ancestors: Do[] = []
  const visited = new Set<string>()
  let current = byId.get(id)
  while (current?.parent_id && !visited.has(current.parent_id)) {
    visited.add(current.parent_id)
    const parent = byId.get(current.parent_id)
    if (!parent) break
    ancestors.push(parent)
    current = parent
  }
  return ancestors
}

/** Return Set of ancestor IDs for fast lookup */
export function getAncestorIds(all: Do[], id: string): Set<string> {
  return new Set(getAncestorChain(all, id).map((d) => d.id))
}
