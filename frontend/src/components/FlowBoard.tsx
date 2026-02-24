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
import { getAncestorChain, getAncestorIds } from "@/lib/ancestry"
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

// ── SVG overlay + off-screen ghost panel ─────────────────────────────────────

const GHOST_UNIT_COLORS: Record<TimeUnit, string> = {
  today: "#7b8ea6",
  week: "#6b82a6",
  month: "#5f7a9e",
  season: "#556f94",
  year: "#4a6386",
  multi_year: "#3e5577",
}

const GHOST_UNIT_LABELS: Record<TimeUnit, string> = {
  today: "Today",
  week: "Week",
  month: "Month",
  season: "Season",
  year: "Year",
  multi_year: "3–5 Yr",
}

// startX/Y = exit point on child card edge; endX/Y = entry point on parent card edge; seamX = column boundary
type Line = { startX: number; startY: number; endX: number; endY: number; seamX: number }
type GhostState = { centerX: number; topY: number; ancestors: Do[] } | null

function AncestryOverlay({
  hoveredDoId,
  ancestorIds,
  allDos,
  boardRef,
}: {
  hoveredDoId: string | null
  ancestorIds: Set<string>
  allDos: Do[]
  boardRef: React.RefObject<HTMLDivElement | null>
}) {
  const [lines, setLines] = useState<Line[]>([])
  const [ghost, setGhost] = useState<GhostState>(null)

  useEffect(() => {
    if (!hoveredDoId || !boardRef.current || ancestorIds.size === 0) {
      setLines([])
      setGhost(null)
      return
    }
    const board = boardRef.current
    const boardRect = board.getBoundingClientRect()

    const hoveredEl = board.querySelector(`[data-do-id="${hoveredDoId}"]`)
    if (!hoveredEl) { setLines([]); setGhost(null); return }

    const hoveredRect = hoveredEl.getBoundingClientRect()
    const hoveredCenterY = hoveredRect.top + hoveredRect.height / 2 - boardRect.top
    const hoveredColEl = hoveredEl.closest("[data-time-column]")

    const newLines: Line[] = []
    const offScreen: Do[] = []

    for (const ancestor of getAncestorChain(allDos, hoveredDoId)) {
      const el = board.querySelector(`[data-do-id="${ancestor.id}"]`)
      if (el) {
        const r = el.getBoundingClientRect()
        const ancestorCenterY = r.top + r.height / 2 - boardRect.top
        const ancestorColEl = el.closest("[data-time-column]")

        let startX: number, endX: number, seamX: number

        if (hoveredColEl && ancestorColEl && hoveredColEl !== ancestorColEl) {
          const hcr = hoveredColEl.getBoundingClientRect()
          const acr = ancestorColEl.getBoundingClientRect()
          if (hcr.right <= acr.left) {
            // Parent is to the right: exit child's right edge, vertical at that seam, enter parent's left edge
            startX = hoveredRect.right - boardRect.left
            seamX  = hcr.right - boardRect.left
            endX   = r.left - boardRect.left
          } else {
            // Parent is to the left: exit child's left edge, vertical at that seam, enter parent's right edge
            startX = hoveredRect.left - boardRect.left
            seamX  = acr.right - boardRect.left
            endX   = r.right - boardRect.left
          }
        } else {
          // Same column: run a short loop outside the right edge of both cards
          const colRight = hoveredColEl
            ? hoveredColEl.getBoundingClientRect().right - boardRect.left
            : Math.max(hoveredRect.right, r.right) - boardRect.left + 8
          startX = hoveredRect.right - boardRect.left
          seamX  = colRight + 8
          endX   = r.right - boardRect.left
        }

        newLines.push({ startX, startY: hoveredCenterY, endX, endY: ancestorCenterY, seamX })
      } else {
        offScreen.push(ancestor)
      }
    }

    setLines(newLines)
    setGhost(
      offScreen.length > 0
        ? { centerX: hoveredRect.left + hoveredRect.width / 2 - boardRect.left, topY: hoveredRect.top - boardRect.top, ancestors: offScreen }
        : null,
    )
  }, [hoveredDoId, ancestorIds, allDos, boardRef])

  if (!hoveredDoId) return null

  return (
    <>
      {lines.length > 0 && (
        <svg
          className="absolute inset-0 pointer-events-none overflow-visible"
          style={{ zIndex: 40, width: "100%", height: "100%" }}
        >
          {lines.map((line, i) => (
            <path
              key={i}
              d={`M ${line.startX} ${line.startY} H ${line.seamX} V ${line.endY} H ${line.endX}`}
              fill="none"
              stroke="#a9bab3"
              strokeWidth="1.5"
              opacity="0.8"
            />
          ))}
        </svg>
      )}

      {ghost && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: ghost.centerX,
            top: ghost.topY - 8,
            transform: "translateX(-50%) translateY(-100%)",
            zIndex: 50,
          }}
        >
          <div className="flex flex-col items-center gap-1">
            {ghost.ancestors.map((ancestor) => (
              <div
                key={ancestor.id}
                className="rounded-lg border border-dashed border-[#a9bab3]/50 bg-white/80 backdrop-blur-sm px-3 py-2 w-52"
              >
                <span
                  className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: GHOST_UNIT_COLORS[ancestor.time_unit] }}
                >
                  {GHOST_UNIT_LABELS[ancestor.time_unit]}
                </span>
                <p className="mt-1 text-sm text-[#202945]/70 leading-snug line-clamp-2">
                  {ancestor.title}
                </p>
              </div>
            ))}
            {/* Dashed connector to card below */}
            <div className="w-px h-2 border-l border-dashed border-[#a9bab3]/50" />
          </div>
        </div>
      )}
    </>
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

  // Dismiss ancestry overlay on Escape
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHoveredDoId(null)
    }
    document.addEventListener("keydown", handle)
    return () => document.removeEventListener("keydown", handle)
  }, [])

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
        <div ref={boardRef} className="hidden md:flex h-full overflow-visible relative" onClick={() => setHoveredDoId(null)}>
          {/* SVG lines + off-screen ghost panel */}
          <AncestryOverlay hoveredDoId={hoveredDoId} ancestorIds={ancestorIds} allDos={allDos} boardRef={boardRef} />

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
