export function getTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

export function getWeekRange(): string {
  const today = new Date()
  const day = today.getDay() // 0 = Sun
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

export function getMonthLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

export function getSeasonLabel(): string {
  const month = new Date().getMonth() // 0–11
  const year = new Date().getFullYear()
  if (month >= 2 && month <= 4) return `Spring ${year}`
  if (month >= 5 && month <= 7) return `Summer ${year}`
  if (month >= 8 && month <= 10) return `Fall ${year}`
  return `Winter ${month === 11 ? year + 1 : year}`
}
