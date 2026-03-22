export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return undefined

  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)

  if ([r, g, b].some((v) => Number.isNaN(v))) return undefined

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
