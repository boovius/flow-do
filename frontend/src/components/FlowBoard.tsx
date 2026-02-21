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
import { getTodayLabel, getWeekRange, getMonthLabel, getSeasonLabel, getYearLabel, getMultiYearLabel } from "@/lib/time"
import { useMoveDo } from "@/hooks/useDos"
import { cn } from "@/lib/utils"
import type { Do, TimeUnit } from "@/types"

const COLUMNS: { unit: TimeUnit; label: string; stripLabel?: string; getDateRange: () => string }[] = [
  { unit: "today", label: "Today", getDateRange: getTodayLabel },
  { unit: "week", label: "Week", getDateRange: getWeekRange },
  { unit: "month", label: "Month", getDateRange: getMonthLabel },
  { unit: "season", label: "Season", getDateRange: getSeasonLabel },
  { unit: "year", label: "Year", stripLabel: "Year", getDateRange: getYearLabel },
  { unit: "multi_year", label: "3–5 Year", stripLabel: "3–5 Yr", getDateRange: getMultiYearLabel },
]

export const VISION_UNITS = new Set<TimeUnit>(["year", "multi_year"])

interface Props {
  focused: TimeUnit | null
  onFocusChange: (unit: TimeUnit | null) => void
}

export function FlowBoard({ focused, onFocusChange }: Props) {
  const [activeDo, setActiveDo] = useState<Do | null>(null)
  const moveDo = useMoveDo()

  // Require a 5px move before a drag starts — prevents accidental drags on taps
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const handleFocus = (unit: TimeUnit) => {
    onFocusChange(focused === unit ? null : unit)
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

  // On mobile, always show a column — fall back to "today" if focused is null
  const mobileUnit: TimeUnit = (focused ?? "today")
  const mobileCol = COLUMNS.find((c) => c.unit === mobileUnit) ?? COLUMNS[0]

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>

      {/* ── Mobile layout ── */}
      <div className="flex flex-col h-full md:hidden">
        <MobileTabBar
          columns={COLUMNS}
          active={mobileUnit}
          onSelect={onFocusChange}
        />
        <div className="flex-1 overflow-hidden">
          <TimeUnitColumn
            key={mobileCol.unit}
            unit={mobileCol.unit}
            label={mobileCol.label}
            stripLabel={mobileCol.stripLabel}
            dateRange={mobileCol.getDateRange()}
            isFocused={true}
            isCollapsed={false}
            onFocus={() => {}}
          />
        </div>
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden md:flex h-full overflow-visible">
        {COLUMNS.map((col) => (
          <TimeUnitColumn
            key={col.unit}
            unit={col.unit}
            label={col.label}
            stripLabel={col.stripLabel}
            dateRange={col.getDateRange()}
            isFocused={focused !== null && !VISION_UNITS.has(focused) && focused === col.unit}
            isCollapsed={
              focused !== null
                ? VISION_UNITS.has(focused)
                  ? !VISION_UNITS.has(col.unit)
                  : focused !== col.unit
                : VISION_UNITS.has(col.unit)
            }
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

function MobileTabBar({
  columns,
  active,
  onSelect,
}: {
  columns: typeof COLUMNS
  active: TimeUnit
  onSelect: (unit: TimeUnit) => void
}) {
  return (
    <div className="flex overflow-x-auto shrink-0 border-b border-black/10 bg-white scrollbar-none">
      {columns.map((col) => (
        <button
          key={col.unit}
          onClick={() => onSelect(col.unit)}
          className={cn(
            "flex-none px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
            active === col.unit
              ? "border-[#202945] text-[#202945]"
              : "border-transparent text-[#a9bab3] hover:text-[#7b8ea6]",
          )}
        >
          {col.label}
        </button>
      ))}
    </div>
  )
}

function DragChip({ title }: { title: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#202945] text-white text-sm shadow-lg cursor-grabbing max-w-[200px]">
      <span className="truncate">{title}</span>
    </div>
  )
}
