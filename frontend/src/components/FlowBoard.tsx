import { createContext, useContext, useEffect, useRef, useState } from "react"
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
import { useMoveDo, useSetParent, useAllDos } from "@/hooks/useDos"
import { getAncestorIds } from "@/lib/ancestry"
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

// ── AncestryContext ──────────────────────────────────────────────────────────

export interface AncestryContextValue {
  hoveredDoId: string | null
  ancestorIds: Set<string>
  onHover: (id: string | null) => void
  allDos: Do[]
}

export const AncestryContext = createContext<AncestryContextValue>({
  hoveredDoId: null,
  ancestorIds: new Set(),
  onHover: () => {},
  allDos: [],
})

export function useAncestry() {
  return useContext(AncestryContext)
}

// ── SVG overlay ──────────────────────────────────────────────────────────────

function AncestryOverlay({
  hoveredDoId,
  ancestorIds,
  boardRef,
}: {
  hoveredDoId: string | null
  ancestorIds: Set<string>
  boardRef: React.RefObject<HTMLDivElement | null>
}) {
  const [lines, setLines] = useState<Array<{ x1: number; y1: number; x2: number; y2: number }>>([])

  useEffect(() => {
    if (!hoveredDoId || !boardRef.current) {
      setLines([])
      return
    }
    const board = boardRef.current
    const boardRect = board.getBoundingClientRect()

    const getCenter = (id: string) => {
      const el = board.querySelector(`[data-do-id="${id}"]`)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return {
        x: r.left + r.width / 2 - boardRect.left,
        y: r.top + r.height / 2 - boardRect.top,
      }
    }

    const childCenter = getCenter(hoveredDoId)
    if (!childCenter) { setLines([]); return }

    const newLines = Array.from(ancestorIds)
      .map((ancestorId) => {
        const ancestorCenter = getCenter(ancestorId)
        if (!ancestorCenter) return null
        return { x1: childCenter.x, y1: childCenter.y, x2: ancestorCenter.x, y2: ancestorCenter.y }
      })
      .filter(Boolean) as Array<{ x1: number; y1: number; x2: number; y2: number }>

    setLines(newLines)
  }, [hoveredDoId, ancestorIds, boardRef])

  if (!hoveredDoId || lines.length === 0) return null

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ zIndex: 40, width: "100%", height: "100%" }}
    >
      {lines.map((line, i) => (
        <line
          key={i}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke="#a9bab3"
          strokeWidth="1.5"
          strokeDasharray="5 4"
          opacity="0.7"
        />
      ))}
    </svg>
  )
}

// ── FlowBoard ────────────────────────────────────────────────────────────────

interface Props {
  focused: TimeUnit | null
  onFocusChange: (unit: TimeUnit | null) => void
}

export function FlowBoard({ focused, onFocusChange }: Props) {
  const [activeDo, setActiveDo] = useState<Do | null>(null)
  const [hoveredDoId, setHoveredDoId] = useState<string | null>(null)
  const moveDo = useMoveDo()
  const setParent = useSetParent()
  const { data: allDos = [] } = useAllDos()
  const boardRef = useRef<HTMLDivElement>(null)

  const ancestorIds = hoveredDoId ? getAncestorIds(allDos, hoveredDoId) : new Set<string>()

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

    // Dropped onto a Do → set parent relationship
    if (over.data.current?.type === "do-item") {
      const parentId = over.id as string
      if (parentId !== (active.id as string)) {
        setParent.mutate({ id: active.id as string, parentId, timeUnit: fromUnit })
      }
      return
    }

    // Dropped onto a column → move
    const toUnit = over.id as TimeUnit
    if (fromUnit === toUnit) return
    moveDo.mutate({ id: active.id as string, fromUnit, toUnit })
  }

  const ancestryCtx: AncestryContextValue = {
    hoveredDoId,
    ancestorIds,
    onHover: setHoveredDoId,
    allDos,
  }

  // On mobile, always show a column — fall back to "today" if focused is null
  const mobileUnit: TimeUnit = (focused ?? "today")
  const mobileCol = COLUMNS.find((c) => c.unit === mobileUnit) ?? COLUMNS[0]

  return (
    <AncestryContext.Provider value={ancestryCtx}>
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
        <div ref={boardRef} className="hidden md:flex h-full overflow-visible relative">
          {/* Spotlight dim overlay */}
          <div
            className="absolute inset-0 pointer-events-none transition-opacity duration-150"
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              opacity: hoveredDoId !== null ? 1 : 0,
              zIndex: 40,
            }}
          />

          {/* SVG connecting lines */}
          <AncestryOverlay hoveredDoId={hoveredDoId} ancestorIds={ancestorIds} boardRef={boardRef} />

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
    </AncestryContext.Provider>
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
