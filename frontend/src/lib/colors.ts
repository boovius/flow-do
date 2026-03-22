export const LINEAGE_COLOR_OPTIONS = [
  "#AFC6E9",
  "#B7DDB0",
  "#E8C39E",
  "#D4B6E6",
  "#E7B5BF",
  "#B9D9D3",
  "#D9C8A9",
  "#C7C6E8",
  "#CFE2B3",
  "#E3C2B0",
]

export function normalizeHexColor(value: string) {
  const trimmed = value.trim()
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`
  return withHash.toUpperCase()
}

export function isValidHexColor(value: string) {
  return /^#?[0-9A-Fa-f]{6}$/.test(value.trim())
}

export function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "")
  if (normalized.length !== 6) return undefined

  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)

  if ([r, g, b].some((v) => Number.isNaN(v))) return undefined

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
