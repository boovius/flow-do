import { useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { useToggleDo, useDeleteDo, useLogMaintenance, useRenameDo, useMoveDo } from "@/hooks/useDos"
import { getPeriodLabel } from "@/lib/time"
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

interface Props {
  item: Do
}

export function DoItem({ item }: Props) {
  const toggle = useToggleDo()
  const remove = useDeleteDo()
  const logMaintenance = useLogMaintenance()
  const rename = useRenameDo()
  const move = useMoveDo()

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { timeUnit: item.time_unit, do: item },
  })

  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState("")
  const [isMoving, setIsMoving] = useState(false)

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

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group rounded-xl transition-all overflow-hidden",
        isDragging ? "opacity-30" : "bg-white/70 shadow-sm hover:bg-white/90 hover:shadow-md",
      )}
    >
      {/* Main row */}
      <div
        onClick={
          isMaintenance && !isMoving
            ? () => logMaintenance.mutate({ id: item.id, timeUnit: item.time_unit })
            : undefined
        }
        className={cn(
          "flex items-start gap-3 py-8 px-4",
          isMaintenance && !isMoving && "cursor-pointer",
          isMaintenance && logMaintenance.isPending && "pointer-events-none opacity-60",
        )}
      >
        {/* Drag handle */}
        <button
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          className="mt-1 flex-none cursor-grab active:cursor-grabbing text-[#a9bab3]/40 hover:text-[#a9bab3] transition-colors opacity-0 group-hover:opacity-100"
          tabIndex={-1}
          aria-label="Drag to move"
        >
          <GripIcon />
        </button>

        {isMaintenance ? (
          <span className="mt-1 h-6 w-6 flex-none flex items-center justify-center text-[#a9bab3]">
            <RepeatIcon />
          </span>
        ) : (
          <button
            onClick={() =>
              toggle.mutate({
                id: item.id,
                timeUnit: item.time_unit,
                completed: !item.completed,
              })
            }
            disabled={toggle.isPending}
            className={cn(
              "mt-1 h-6 w-6 rounded-full border-2 flex-none transition-all duration-150 grid place-items-center",
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

        {/* Title */}
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
            onClick={(e) => e.stopPropagation()}
            className="flex-1 text-lg leading-7 bg-transparent outline-none border-b border-[#202945]/30 focus:border-[#202945] text-[#202945] transition-colors"
          />
        ) : (
          <span
            onClick={startEditing}
            className={cn(
              "flex-1 text-lg leading-7 transition-colors cursor-text",
              item.completed ? "line-through text-[#a9bab3]" : "text-[#202945]",
            )}
          >
            {item.title}
          </span>
        )}

        {isMaintenance ? (
          <span className="text-xs text-[#7b8ea6]/60 flex-none mt-1">
            {item.completion_count}× {getPeriodLabel(item.time_unit)}
          </span>
        ) : (
          item.flow_count > 0 && !item.completed && (
            <span
              className="text-xs text-[#7b8ea6]/60 flex-none mt-1"
              title={`Flowed up ${item.flow_count} time${item.flow_count === 1 ? "" : "s"}`}
            >
              ↑{item.flow_count}
            </span>
          )
        )}

        {/* Move picker toggle — always visible on mobile, hover-revealed on desktop */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsMoving((v) => !v)
          }}
          className={cn(
            "mt-1.5 flex-none transition-opacity",
            isMoving ? "text-[#202945]" : "text-[#a9bab3] hover:text-[#202945]",
            "opacity-100 md:opacity-0 md:group-hover:opacity-100",
          )}
          aria-label="Move to…"
        >
          <MoveIcon />
        </button>

        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            remove.mutate({ id: item.id, timeUnit: item.time_unit })
          }}
          disabled={remove.isPending}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[#a9bab3] hover:text-[#202945] flex-none text-base leading-6 grid place-items-center"
          aria-label="Delete"
        >
          {remove.isPending ? <SpinnerIcon /> : "×"}
        </button>
      </div>

      {/* Move picker */}
      {isMoving && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {TIME_UNITS.filter((u) => u !== item.time_unit).map((unit) => (
            <button
              key={unit}
              onClick={() => {
                move.mutate({ id: item.id, fromUnit: item.time_unit, toUnit: unit })
                setIsMoving(false)
              }}
              disabled={move.isPending}
              className={cn(
                "px-2.5 py-1 text-xs rounded-full transition-colors",
                "bg-[#202945]/10 text-[#202945]/70 hover:bg-[#202945]/20 hover:text-[#202945]",
                move.isPending && "opacity-50 pointer-events-none",
              )}
            >
              {TIME_UNIT_LABELS[unit]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 8 12" fill="currentColor">
      <circle cx="2" cy="2" r="1.2" />
      <circle cx="6" cy="2" r="1.2" />
      <circle cx="2" cy="6" r="1.2" />
      <circle cx="6" cy="6" r="1.2" />
      <circle cx="2" cy="10" r="1.2" />
      <circle cx="6" cy="10" r="1.2" />
    </svg>
  )
}

function MoveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 8h10M9 5l3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden>
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
