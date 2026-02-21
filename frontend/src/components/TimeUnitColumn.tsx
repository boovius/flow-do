import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import { useDos, useCreateDo } from "@/hooks/useDos"
import { DoItem } from "@/components/DoItem"
import { AddDoInput } from "@/components/AddDoInput"
import type { TimeUnit } from "@/types"

// Per-column palette: body bg, header bg, z-index, shadow
const COLUMN_STYLE: Record<
  TimeUnit,
  { body: string; header: string; z: number; shadow: string }
> = {
  today: {
    body: "#ffffff",
    header: "#f7f7f7",
    z: 1,
    shadow: "none",
  },
  week: {
    body: "#f3f3f2",
    header: "#e7e7e6",
    z: 2,
    shadow: "-8px 0 20px rgba(32,41,69,0.07)",
  },
  month: {
    body: "#f0f4f2",
    header: "#dde8e2",
    z: 3,
    shadow: "-8px 0 20px rgba(32,41,69,0.09)",
  },
  season: {
    body: "#eaedf3",
    header: "#d4dae8",
    z: 4,
    shadow: "-8px 0 20px rgba(32,41,69,0.11)",
  },
  year: {
    body: "#e6e9f0",
    header: "#cdd3e2",
    z: 5,
    shadow: "-8px 0 20px rgba(32,41,69,0.13)",
  },
  multi_year: {
    body: "#e0e4ef",
    header: "#c4cce0",
    z: 6,
    shadow: "-8px 0 20px rgba(32,41,69,0.15)",
  },
}

interface Props {
  unit: TimeUnit
  label: string
  stripLabel?: string
  dateRange: string
  isFocused: boolean
  isCollapsed: boolean
  onFocus: () => void
}

export function TimeUnitColumn({
  unit,
  label,
  stripLabel,
  dateRange,
  isFocused,
  isCollapsed,
  onFocus,
}: Props) {
  const style = COLUMN_STYLE[unit]
  const { data: dos = [], isLoading } = useDos(unit)
  const createDo = useCreateDo()
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: unit })

  return (
    <div
      className={cn(
        "relative flex flex-col",
        "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden",
        isCollapsed ? "w-10 flex-none" : isFocused ? "flex-[3]" : "flex-1",
      )}
      style={{
        backgroundColor: style.body,
        zIndex: style.z,
        boxShadow: style.shadow,
      }}
    >
      {/* Header */}
      <button
        onClick={onFocus}
        className={cn(
          "group w-full text-left transition-colors duration-200",
          isCollapsed
            ? "flex h-full flex-col items-center justify-start pt-5 px-0"
            : "flex flex-col gap-0.5 px-5 py-4",
        )}
        style={
          isCollapsed
            ? { backgroundColor: style.header }
            : { backgroundColor: style.header }
        }
        aria-label={isCollapsed ? `Expand ${label}` : `Focus ${label}`}
      >
        {isCollapsed ? (
          <span
            className={cn(
              "[writing-mode:vertical-rl] rotate-180",
              "text-xs font-medium tracking-widest uppercase",
              "text-[#202945]/30 group-hover:text-[#202945]/60",
              "transition-colors duration-200",
            )}
          >
            {stripLabel ?? label}
          </span>
        ) : (
          <>
            <span
              className={cn(
                "font-semibold tracking-tight text-[#202945] transition-all duration-500",
                isFocused ? "text-xl" : "text-base",
              )}
            >
              {label}
            </span>
            <span className="text-xs text-[#7b8ea6]">{dateRange}</span>
          </>
        )}
      </button>

      {/* Body — also the drop target */}
      {!isCollapsed && (
        <div
          ref={setDropRef}
          className={cn(
            "flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3 transition-colors duration-150",
            isOver && "bg-[#202945]/[0.04]",
          )}
        >
          {isLoading ? (
            <LoadingSkeleton />
          ) : dos.length === 0 ? (
            <EmptyState isFocused={isFocused} />
          ) : (
            dos.map((item) => <DoItem key={item.id} item={item} />)
          )}

          {/* Add Do input pinned to bottom of list */}
          <div className="mt-2">
            <AddDoInput
              onAdd={(title, doType) =>
                createDo.mutate({ title, time_unit: unit, do_type: doType })
              }
              disabled={createDo.isPending}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function EmptyState({ isFocused }: { isFocused: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center min-h-16 transition-opacity duration-500",
        isFocused ? "opacity-40" : "opacity-20",
      )}
    >
      <p className="text-xs text-[#202945] text-center">No dos yet</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-2 animate-pulse">
      {[60, 80, 45].map((w, i) => (
        <div
          key={i}
          className="h-4 rounded bg-[#202945]/5"
          style={{ width: `${w}%` }}
        />
      ))}
    </div>
  )
}
