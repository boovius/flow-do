import { cn } from "@/lib/utils"
import { useToggleDo, useDeleteDo } from "@/hooks/useDos"
import type { Do } from "@/types"

interface Props {
  item: Do
}

export function DoItem({ item }: Props) {
  const toggle = useToggleDo()
  const remove = useDeleteDo()

  return (
    <div className="group flex items-start gap-2.5 py-2 px-1 rounded-md hover:bg-black/[0.03] transition-colors">
      {/* Circle checkbox */}
      <button
        onClick={() =>
          toggle.mutate({
            id: item.id,
            timeUnit: item.time_unit,
            completed: !item.completed,
          })
        }
        className={cn(
          "mt-0.5 h-4 w-4 rounded-full border-2 flex-none transition-all duration-150 grid place-items-center",
          item.completed
            ? "bg-[#202945] border-[#202945]"
            : "border-[#a9bab3] hover:border-[#7b8ea6]",
        )}
        aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
      >
        {item.completed && (
          <svg viewBox="0 0 10 10" className="h-2 w-2" fill="none">
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

      {/* Title */}
      <span
        className={cn(
          "flex-1 text-sm leading-5 transition-colors",
          item.completed ? "line-through text-[#a9bab3]" : "text-[#202945]",
        )}
      >
        {item.title}
      </span>

      {/* Flow count badge — shows if this do has bounced back up */}
      {item.flow_count > 0 && !item.completed && (
        <span
          className="text-[10px] text-[#7b8ea6]/60 flex-none mt-0.5"
          title={`Flowed up ${item.flow_count} time${item.flow_count === 1 ? "" : "s"}`}
        >
          ↑{item.flow_count}
        </span>
      )}

      {/* Delete — only visible on hover */}
      <button
        onClick={() => remove.mutate({ id: item.id, timeUnit: item.time_unit })}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-[#a9bab3] hover:text-[#202945] flex-none text-xs leading-5"
        aria-label="Delete"
      >
        ×
      </button>
    </div>
  )
}
