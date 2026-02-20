import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { TimeUnitColumn } from "@/components/TimeUnitColumn"
import { getTodayLabel, getWeekRange, getMonthLabel, getSeasonLabel } from "@/lib/time"
import { useMoveDo } from "@/hooks/useDos"
import type { Do, TimeUnit } from "@/types"

const COLUMNS: { unit: TimeUnit; label: string; getDateRange: () => string }[] = [
  { unit: "today", label: "Today", getDateRange: getTodayLabel },
  { unit: "week", label: "Week", getDateRange: getWeekRange },
  { unit: "month", label: "Month", getDateRange: getMonthLabel },
  { unit: "season", label: "Season", getDateRange: getSeasonLabel },
]

function getInitialFocused(): TimeUnit | null {
  if (typeof window !== "undefined" && window.innerWidth < 768) return "today"
  return null
}

export function FlowBoard() {
  const [focused, setFocused] = useState<TimeUnit | null>(getInitialFocused)
  const [activeDo, setActiveDo] = useState<Do | null>(null)
  const moveDo = useMoveDo()

  // Require a 5px move before a drag starts — prevents accidental drags on taps
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const handleFocus = (unit: TimeUnit) => {
    setFocused((prev) => (prev === unit ? null : unit))
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDo((event.active.data.current?.do as Do) ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDo(null)

    if (!over || !active.data.current) return

    const fromUnit = active.data.current.timeUnit as TimeUnit
    const toUnit = over.id as TimeUnit

    if (fromUnit === toUnit) return

    moveDo.mutate({ id: active.id as string, fromUnit, toUnit })
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-full overflow-visible">
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

      {/* Floating chip that follows the cursor while dragging */}
      <DragOverlay dropAnimation={null}>
        {activeDo ? <DragChip title={activeDo.title} /> : null}
      </DragOverlay>
    </DndContext>
  )
}

function DragChip({ title }: { title: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#202945] text-white text-sm shadow-lg cursor-grabbing max-w-[200px]">
      <span className="truncate">{title}</span>
    </div>
  )
}
