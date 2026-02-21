import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useSetParent, useUnsetParent } from "@/hooks/useDos"
import type { Do, TimeUnit } from "@/types"

const TIME_UNIT_LABELS: Record<TimeUnit, string> = {
  today: "Today",
  week: "Week",
  month: "Month",
  season: "Season",
  year: "Year",
  multi_year: "3–5 Yr",
}

const TIME_UNIT_ORDER: TimeUnit[] = ["today", "week", "month", "season", "year", "multi_year"]

interface Props {
  item: Do
  allDos: Do[]
  onClose: () => void
}

export function ParentPicker({ item, allDos, onClose }: Props) {
  const [query, setQuery] = useState("")
  const setParent = useSetParent()
  const unsetParent = useUnsetParent()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handle)
    return () => document.removeEventListener("keydown", handle)
  }, [onClose])

  // Candidates: all Dos except self and existing descendants (avoid cycles)
  const q = query.trim().toLowerCase()
  const candidates = allDos.filter((d) => {
    if (d.id === item.id) return false
    if (q && !d.title.toLowerCase().includes(q)) return false
    return true
  })

  // Group by time_unit
  const grouped = TIME_UNIT_ORDER.reduce<Record<TimeUnit, Do[]>>(
    (acc, unit) => {
      acc[unit] = candidates.filter((d) => d.time_unit === unit)
      return acc
    },
    {} as Record<TimeUnit, Do[]>,
  )

  const handleSelect = (parentId: string) => {
    setParent.mutate({ id: item.id, parentId, timeUnit: item.time_unit })
    onClose()
  }

  const handleRemove = () => {
    unsetParent.mutate({ id: item.id, timeUnit: item.time_unit })
    onClose()
  }

  return (
    <div
      ref={containerRef}
      className="absolute right-0 top-full mt-1 z-50 w-72 rounded-xl bg-white shadow-lg border border-black/10 overflow-hidden"
    >
      {/* Remove parent option */}
      {item.parent_id && (
        <button
          onClick={handleRemove}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 border-b border-black/5 transition-colors"
        >
          <span className="text-base">↗</span>
          Remove parent
        </button>
      )}

      {/* Search input */}
      <div className="px-3 py-2 border-b border-black/5">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Dos…"
          className="w-full text-sm text-[#202945] placeholder-[#a9bab3] outline-none bg-transparent"
        />
      </div>

      {/* Results */}
      <div className="max-h-64 overflow-y-auto">
        {TIME_UNIT_ORDER.map((unit) => {
          const group = grouped[unit]
          if (!group.length) return null
          return (
            <div key={unit}>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#a9bab3]">
                {TIME_UNIT_LABELS[unit]}
              </div>
              {group.map((d) => (
                <button
                  key={d.id}
                  onClick={() => handleSelect(d.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm text-[#202945] hover:bg-[#202945]/5 transition-colors truncate",
                    d.id === item.parent_id && "font-medium text-[#202945]",
                  )}
                >
                  {d.id === item.parent_id && <span className="mr-1 text-[#a9bab3]">✓</span>}
                  {d.title}
                </button>
              ))}
            </div>
          )
        })}
        {candidates.length === 0 && (
          <p className="px-3 py-4 text-sm text-[#a9bab3] text-center">No Dos found</p>
        )}
      </div>
    </div>
  )
}
