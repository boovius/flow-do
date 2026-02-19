import { useState } from "react"
import { TimeUnitColumn } from "@/components/TimeUnitColumn"
import { getTodayLabel, getWeekRange, getMonthLabel, getSeasonLabel } from "@/lib/time"
import type { TimeUnit } from "@/types"

const COLUMNS: { unit: TimeUnit; label: string; getDateRange: () => string }[] = [
  { unit: "today", label: "Today", getDateRange: getTodayLabel },
  { unit: "week", label: "Week", getDateRange: getWeekRange },
  { unit: "month", label: "Month", getDateRange: getMonthLabel },
  { unit: "season", label: "Season", getDateRange: getSeasonLabel },
]

export function FlowBoard() {
  const [focused, setFocused] = useState<TimeUnit | null>(null)

  const handleFocus = (unit: TimeUnit) => {
    setFocused((prev) => (prev === unit ? null : unit))
  }

  return (
    <div className="flex h-full">
      {COLUMNS.map((col) => (
        <TimeUnitColumn
          key={col.unit}
          unit={col.unit}
          label={col.label}
          dateRange={col.getDateRange()}
          isFocused={focused === col.unit}
          isCollapsed={focused !== null && focused !== col.unit}
          onFocus={() => handleFocus(col.unit)}
        />
      ))}
    </div>
  )
}
