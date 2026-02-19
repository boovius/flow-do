import { cn } from "@/lib/utils"
import type { TimeUnit } from "@/types"

interface Props {
  unit: TimeUnit
  label: string
  dateRange: string
  isFocused: boolean
  isCollapsed: boolean
  onFocus: () => void
}

export function TimeUnitColumn({
  label,
  dateRange,
  isFocused,
  isCollapsed,
  onFocus,
}: Props) {
  return (
    <div
      className={cn(
        "relative flex flex-col border-r border-border/30 last:border-r-0",
        "transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden",
        isCollapsed ? "w-10 flex-none" : isFocused ? "flex-[3]" : "flex-1",
      )}
    >
      {/* Column header — always visible, acts as the focus toggle */}
      <button
        onClick={onFocus}
        className={cn(
          "group w-full text-left transition-colors duration-200 hover:bg-muted/40",
          isCollapsed
            ? "flex h-full flex-col items-center justify-start pt-5 px-0"
            : "flex flex-col gap-0.5 px-5 py-4 border-b border-border/20",
        )}
        aria-label={isCollapsed ? `Expand ${label}` : `Focus ${label}`}
      >
        {isCollapsed ? (
          <span
            className={cn(
              "[writing-mode:vertical-rl] rotate-180",
              "text-xs font-medium tracking-widest uppercase",
              "text-muted-foreground/50 group-hover:text-muted-foreground",
              "transition-colors duration-200",
            )}
          >
            {label}
          </span>
        ) : (
          <>
            <span
              className={cn(
                "font-semibold tracking-tight transition-all duration-500",
                isFocused ? "text-xl" : "text-base",
              )}
            >
              {label}
            </span>
            <span className="text-xs text-muted-foreground/70">{dateRange}</span>
          </>
        )}
      </button>

      {/* Column body */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <EmptyState unit={label} isFocused={isFocused} />
        </div>
      )}
    </div>
  )
}

function EmptyState({ unit, isFocused }: { unit: string; isFocused: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center h-full min-h-32",
        "transition-opacity duration-500",
        isFocused ? "opacity-60" : "opacity-30",
      )}
    >
      <p className="text-sm text-muted-foreground text-center">
        No tasks in {unit.toLowerCase()} yet
      </p>
    </div>
  )
}
