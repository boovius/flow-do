import { useContext, useEffect, useRef, useState } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { useToggleDo, useDeleteDo, useLogMaintenance, useRenameDo, useMoveDo, useCreateDo } from "@/hooks/useDos"
import { getPeriodLabel } from "@/lib/time"
import { AncestryContext } from "@/components/FlowBoard"
import { ParentPicker } from "@/components/ParentPicker"
import { AncestryPanel } from "@/components/AncestryPanel"
import type { Do, TimeUnit } from "@/types"

const TIME_UNITS: TimeUnit[] = ["today", "week", "month", "season", "year", "multi_year"]
const TIME_UNIT_LABELS: Record<TimeUnit, string> = {
  today: "Today",
  week: "Week",
  month: "Month",
  season: "Season",
  year: "Year",
  multi_year: "3–5 Yr",
}

const CHILD_UNIT: Record<TimeUnit, TimeUnit> = {
  multi_year: "year",
  year: "season",
  season: "month",
  month: "week",
  week: "today",
  today: "today",
}

interface Props {
  item: Do
}

export function DoItem({ item }: Props) {
  const toggle = useToggleDo()
  const remove = useDeleteDo()
  const logMaintenance = useLogMaintenance()
  const rename = useRenameDo()
  const move = useMoveDo()
  const createDo = useCreateDo()

  const { hoveredDoId, ancestorIds, onHover, allDos } = useContext(AncestryContext)
  const isHovered = hoveredDoId === item.id
  const isAncestor = ancestorIds.has(item.id)
  const isDimmed = hoveredDoId !== null && ancestorIds.size > 0 && !isHovered && !isAncestor

  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: item.id,
    data: { timeUnit: item.time_unit, do: item },
  })

  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({
    id: item.id,
    data: { type: "do-item" },
  })

  const setNodeRef = (el: HTMLElement | null) => {
    setDragRef(el)
    setDropRef(el)
  }

  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState("")
  const [showOptions, setShowOptions] = useState(false)
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [showAddChild, setShowAddChild] = useState(false)
  const [showAncestryPanel, setShowAncestryPanel] = useState(false)

  const optionsRef = useRef<HTMLDivElement>(null)

  // Close options popover on outside click
  useEffect(() => {
    if (!showOptions) return
    const handler = (e: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setShowOptions(false)
        setShowMoveMenu(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showOptions])

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDraftTitle(item.title)
    setIsEditing(true)
  }

  const saveEdit = () => {
    setIsEditing(false)
    const trimmed = draftTitle.trim()
    if (trimmed && trimmed !== item.title) {
      rename.mutate({ id: item.id, timeUnit: item.time_unit, title: trimmed })
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setDraftTitle("")
  }

  const isMaintenance = item.do_type === "maintenance"
  const hasParent = !!item.parent_id
  const hasChildren = allDos.some((d) => d.parent_id === item.id)

  // Time-unit navigation
  const currentIdx = TIME_UNITS.indexOf(item.time_unit)
  const prevUnit = currentIdx > 0 ? TIME_UNITS[currentIdx - 1] : null
  const nextUnit = currentIdx < TIME_UNITS.length - 1 ? TIME_UNITS[currentIdx + 1] : null

  return (
    <div
      data-do-id={item.id}
      onClick={(e) => e.stopPropagation()}
      style={{
        opacity: isDimmed ? 0.08 : 1,
        zIndex: isAncestor || isHovered ? 50 : undefined,
        transition: "opacity 0.15s",
      }}
      className="group relative flex items-stretch gap-1"
    >
      {/* ── Left arrow – move to lower time unit (hidden for first unit) ── */}
      {prevUnit ? (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            move.mutate({ id: item.id, fromUnit: item.time_unit, toUnit: prevUnit })
          }}
          disabled={move.isPending}
          title={`Move to ${TIME_UNIT_LABELS[prevUnit]}`}
          aria-label={`Move to ${TIME_UNIT_LABELS[prevUnit]}`}
          className="flex-none w-5 flex items-center justify-center rounded transition-colors text-[#a9bab3] hover:text-[#202945] opacity-100 md:opacity-0 md:group-hover:opacity-100"
        >
          <ChevronLeftIcon />
        </button>
      ) : null}

      {/* ── Card ── */}
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
        className={cn(
          "flex-1 relative rounded-xl transition-all overflow-visible",
          isDragging ? "opacity-30" : "bg-white/70 shadow-sm hover:bg-white/90 hover:shadow-md",
          isDropOver && !isDragging && "ring-2 ring-blue-400 ring-offset-1",
        )}
      >
        {/* Top bar: lineage icon (left) + options icon (right) */}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-1">

          {/* Lineage icon — only shown when this do has a parent */}
          {hasParent ? (
            <>
              {/* Desktop: click toggles ancestry overlay */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onHover(hoveredDoId === item.id ? null : item.id)
                }}
                title="View ancestry"
                className={cn(
                  "hidden md:flex items-center justify-center w-5 h-5 transition-colors",
                  isHovered ? "text-[#202945]" : "text-[#a9bab3] hover:text-[#7b8ea6]",
                )}
              >
                <LineageIcon hasChildren={hasChildren} />
              </button>

              {/* Mobile: click opens ancestry panel */}
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  setShowAncestryPanel(true)
                }}
                title="View ancestry"
                className="md:hidden flex items-center justify-center w-5 h-5 text-[#a9bab3]"
              >
                <LineageIcon hasChildren={hasChildren} />
              </button>
            </>
          ) : (
            <div className="w-5 h-5" aria-hidden />
          )}

          {/* Options button + popover */}
          <div ref={optionsRef} className="relative">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setShowOptions((v) => !v)
                if (showOptions) setShowMoveMenu(false)
              }}
              aria-label="Options"
              className={cn(
                "flex items-center justify-center w-5 h-5 transition-colors",
                showOptions ? "text-[#202945]" : "text-[#a9bab3] hover:text-[#202945]",
              )}
            >
              <OptionsIcon />
            </button>

            {showOptions && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-6 z-50 w-44 rounded-xl bg-white shadow-lg border border-black/[0.07] py-1 overflow-hidden"
              >
                {/* Move */}
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMoveMenu((v) => !v)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-[#202945] hover:bg-[#202945]/5 flex items-center gap-2"
                >
                  <MoveIcon />
                  <span className="flex-1">Move</span>
                  <span className="text-[#a9bab3] text-[10px]">{showMoveMenu ? "▲" : "▼"}</span>
                </button>
                {showMoveMenu && (
                  <div className="px-3 pb-2 flex flex-wrap gap-1">
                    {TIME_UNITS.filter((u) => u !== item.time_unit).map((unit) => (
                      <button
                        key={unit}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          move.mutate({ id: item.id, fromUnit: item.time_unit, toUnit: unit })
                          setShowOptions(false)
                          setShowMoveMenu(false)
                        }}
                        disabled={move.isPending}
                        className="px-2 py-0.5 text-xs rounded-full bg-[#202945]/10 text-[#202945]/70 hover:bg-[#202945]/20"
                      >
                        {TIME_UNIT_LABELS[unit]}
                      </button>
                    ))}
                  </div>
                )}

                {/* Link to parent */}
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowOptions(false)
                    setShowMoveMenu(false)
                    setShowPicker((v) => !v)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-[#202945] hover:bg-[#202945]/5 flex items-center gap-2"
                >
                  <ChainIcon />
                  Link to parent
                </button>

                {/* Add child */}
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowOptions(false)
                    setShowAddChild(true)
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-[#202945] hover:bg-[#202945]/5 flex items-center gap-2"
                >
                  <AddChildIcon />
                  Add child
                </button>

                <div className="my-1 border-t border-black/[0.06]" />

                {/* Delete */}
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation()
                    remove.mutate({ id: item.id, timeUnit: item.time_unit })
                    setShowOptions(false)
                  }}
                  disabled={remove.isPending}
                  className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                >
                  {remove.isPending ? <SpinnerIcon /> : <TrashIcon />}
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content row */}
        <div
          onClick={
            isMaintenance
              ? (e) => {
                  e.stopPropagation()
                  logMaintenance.mutate({ id: item.id, timeUnit: item.time_unit })
                }
              : undefined
          }
          className={cn(
            "flex items-center gap-2 px-3 pb-3.5",
            isMaintenance && "cursor-pointer",
            isMaintenance && logMaintenance.isPending && "pointer-events-none opacity-60",
          )}
        >
          {isMaintenance ? (
            <span className="flex-none h-5 w-5 flex items-center justify-center text-[#a9bab3]">
              <RepeatIcon />
            </span>
          ) : (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                toggle.mutate({ id: item.id, timeUnit: item.time_unit, completed: !item.completed })
              }}
              disabled={toggle.isPending}
              className={cn(
                "h-5 w-5 rounded-full border-2 flex-none transition-all duration-150 grid place-items-center",
                item.completed
                  ? "bg-[#202945] border-[#202945]"
                  : "border-[#a9bab3] hover:border-[#7b8ea6]",
                toggle.isPending && "opacity-50 animate-pulse",
              )}
              aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
            >
              {item.completed && (
                <svg viewBox="0 0 10 10" className="h-3 w-3" fill="none">
                  <path
                    d="M1.5 5l2.5 2.5 4.5-4.5"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          )}

          {isEditing ? (
            <input
              autoFocus
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              onBlur={saveEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); saveEdit() }
                if (e.key === "Escape") { e.preventDefault(); cancelEdit() }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 text-sm bg-transparent outline-none border-b border-[#202945]/30 focus:border-[#202945] text-[#202945]"
            />
          ) : (
            <span
              onPointerDown={(e) => e.stopPropagation()}
              onClick={startEditing}
              className={cn(
                "flex-1 text-sm leading-snug cursor-text",
                item.completed ? "line-through text-[#a9bab3]" : "text-[#202945]",
              )}
            >
              {item.title}
            </span>
          )}

          {isMaintenance ? (
            <span className="text-xs text-[#7b8ea6]/60 flex-none">
              {item.completion_count}× {getPeriodLabel(item.time_unit)}
            </span>
          ) : (
            item.flow_count > 0 && !item.completed && (
              <span
                className="text-xs text-[#7b8ea6]/60 flex-none"
                title={`Flowed up ${item.flow_count} time${item.flow_count === 1 ? "" : "s"}`}
              >
                ↑{item.flow_count}
              </span>
            )
          )}
        </div>

        {/* Parent picker popover */}
        {showPicker && (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <ParentPicker
              item={item}
              allDos={allDos}
              onClose={() => setShowPicker(false)}
            />
          </div>
        )}

        {/* Add child form */}
        {showAddChild && (
          <AddChildForm
            parentItem={item}
            onClose={() => setShowAddChild(false)}
            onCreate={(title, unit) => {
              createDo.mutate({ title, time_unit: unit, parent_id: item.id })
              setShowAddChild(false)
            }}
          />
        )}
      </div>

      {/* ── Right arrow – move to higher time unit (hidden for last unit) ── */}
      {nextUnit ? (
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            move.mutate({ id: item.id, fromUnit: item.time_unit, toUnit: nextUnit })
          }}
          disabled={move.isPending}
          title={`Move to ${TIME_UNIT_LABELS[nextUnit]}`}
          aria-label={`Move to ${TIME_UNIT_LABELS[nextUnit]}`}
          className="flex-none w-5 flex items-center justify-center rounded transition-colors text-[#a9bab3] hover:text-[#202945] opacity-100 md:opacity-0 md:group-hover:opacity-100"
        >
          <ChevronRightIcon />
        </button>
      ) : null}

      {/* Mobile ancestry panel */}
      {showAncestryPanel && (
        <AncestryPanel
          item={item}
          allDos={allDos}
          onClose={() => setShowAncestryPanel(false)}
        />
      )}
    </div>
  )
}

// ── AddChildForm ──────────────────────────────────────────────────────────────

function AddChildForm({
  parentItem,
  onClose,
  onCreate,
}: {
  parentItem: Do
  onClose: () => void
  onCreate: (title: string, unit: TimeUnit) => void
}) {
  const defaultUnit = CHILD_UNIT[parentItem.time_unit]
  const [title, setTitle] = useState("")
  const [unit, setUnit] = useState<TimeUnit>(defaultUnit)

  const submit = () => {
    const trimmed = title.trim()
    if (!trimmed) return
    onCreate(trimmed, unit)
  }

  return (
    <div className="px-3 pb-3.5 space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex gap-1.5 flex-wrap">
        {TIME_UNITS.map((u) => (
          <button
            key={u}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setUnit(u) }}
            className={cn(
              "px-2.5 py-1 text-xs rounded-full transition-colors",
              unit === u
                ? "bg-[#202945] text-white"
                : "bg-[#202945]/10 text-[#202945]/70 hover:bg-[#202945]/20",
            )}
          >
            {TIME_UNIT_LABELS[u]}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); submit() }
            if (e.key === "Escape") { e.preventDefault(); onClose() }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          placeholder="Child Do title…"
          className="flex-1 text-sm bg-transparent outline-none border-b border-[#202945]/30 focus:border-[#202945] text-[#202945] pb-0.5 placeholder-[#a9bab3]"
        />
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); submit() }}
          disabled={!title.trim()}
          className="text-xs px-2.5 py-1 rounded-full bg-[#202945] text-white disabled:opacity-40 transition-opacity"
        >
          Add
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onClose() }}
          className="text-xs px-2 py-1 text-[#a9bab3] hover:text-[#202945] transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function LineageIcon({ hasChildren }: { hasChildren: boolean }) {
  // Git-tree style: vertical trunk (extends down when this do has children),
  // horizontal branch right, node dot.
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      {/* Vertical trunk — full height when has children, half when leaf */}
      <line x1="4" y1="0" x2="4" y2={hasChildren ? "14" : "7"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Horizontal branch */}
      <line x1="4" y1="7" x2="11" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Node dot */}
      <circle cx="11" cy="7" r="1.5" fill="currentColor" />
    </svg>
  )
}

function OptionsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <line x1="2" y1="3.5" x2="12" y2="3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="2" y1="10.5" x2="12" y2="10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 16" fill="none" aria-hidden>
      <path d="M7 2L2 8l5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 16" fill="none" aria-hidden>
      <path d="M3 2l5 6-5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function MoveIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M8 2v12M2 8h12M8 2L5.5 4.5M8 2L10.5 4.5M8 14L5.5 11.5M8 14L10.5 11.5M2 8L4.5 5.5M2 8L4.5 10.5M14 8L11.5 5.5M14 8L11.5 10.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChainIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6.5 9.5a3.5 3.5 0 0 0 5 0l2-2a3.536 3.536 0 0 0-5-5L7 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 6.5a3.5 3.5 0 0 0-5 0l-2 2a3.536 3.536 0 0 0 5 5L9 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function AddChildIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 3v6a2 2 0 0 0 2 2h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 8l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function RepeatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M4 7h10M4 7l3-3M4 7l3 3M16 13H6m10 0l-3-3m3 3l-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
