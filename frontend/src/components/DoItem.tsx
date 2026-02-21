import { useDraggable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { useToggleDo, useDeleteDo, useLogMaintenance } from "@/hooks/useDos"
import { getPeriodLabel } from "@/lib/time"
import type { Do } from "@/types"

interface Props {
  item: Do
}

export function DoItem({ item }: Props) {
  const toggle = useToggleDo()
  const remove = useDeleteDo()
  const logMaintenance = useLogMaintenance()

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { timeUnit: item.time_unit, do: item },
  })

  const isMaintenance = item.do_type === "maintenance"

  return (
    <div
      ref={setNodeRef}
      onClick={
        isMaintenance
          ? () => logMaintenance.mutate({ id: item.id, timeUnit: item.time_unit })
          : undefined
      }
      className={cn(
        "group flex items-start gap-3 py-8 px-4 rounded-xl transition-all",
        isDragging
          ? "opacity-30"
          : "bg-white/70 shadow-sm hover:bg-white/90 hover:shadow-md",
        isMaintenance && "cursor-pointer",
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
        /* Repeat icon in place of checkbox */
        <span className="mt-1 h-6 w-6 flex-none flex items-center justify-center text-[#a9bab3]">
          <RepeatIcon />
        </span>
      ) : (
        /* Circle checkbox */
        <button
          onClick={() =>
            toggle.mutate({
              id: item.id,
              timeUnit: item.time_unit,
              completed: !item.completed,
            })
          }
          className={cn(
            "mt-1 h-6 w-6 rounded-full border-2 flex-none transition-all duration-150 grid place-items-center",
            item.completed
              ? "bg-[#202945] border-[#202945]"
              : "border-[#a9bab3] hover:border-[#7b8ea6]",
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
      <span
        className={cn(
          "flex-1 text-lg leading-7 transition-colors",
          item.completed ? "line-through text-[#a9bab3]" : "text-[#202945]",
        )}
      >
        {item.title}
      </span>

      {isMaintenance ? (
        /* Completion count badge — always visible */
        <span className="text-xs text-[#7b8ea6]/60 flex-none mt-1">
          {item.completion_count}× {getPeriodLabel(item.time_unit)}
        </span>
      ) : (
        /* Flow count badge */
        item.flow_count > 0 && !item.completed && (
          <span
            className="text-xs text-[#7b8ea6]/60 flex-none mt-1"
            title={`Flowed up ${item.flow_count} time${item.flow_count === 1 ? "" : "s"}`}
          >
            ↑{item.flow_count}
          </span>
        )
      )}

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          remove.mutate({ id: item.id, timeUnit: item.time_unit })
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-[#a9bab3] hover:text-[#202945] flex-none text-base leading-6"
        aria-label="Delete"
      >
        ×
      </button>
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
