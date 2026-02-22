import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { useUnsetParent } from "@/hooks/useDos"
import { getAncestorChain } from "@/lib/ancestry"
import type { Do, TimeUnit } from "@/types"

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
  allDos: Do[]
  onClose: () => void
}

export function AncestryPanel({ item, allDos, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const unsetParent = useUnsetParent()
  const backdropRef = useRef<HTMLDivElement>(null)

  // Slide in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  const ancestors = getAncestorChain(allDos, item.id)

  const handleUnlink = (ancestorId: string) => {
    // Find the child whose parent is this ancestor
    allDos.find((d) => d.id === item.id && d.parent_id === ancestorId)
      ?? allDos.find((d) => {
        // Walk chain to find the Do that directly points to ancestorId
        let cur: Do | undefined = item
        while (cur) {
          if (cur.parent_id === ancestorId) return d.id === cur.id
          cur = allDos.find((x) => x.id === cur!.parent_id)
        }
        return false
      })
    // Unlink item itself if the direct parent is this ancestor
    if (item.parent_id === ancestorId) {
      unsetParent.mutate({ id: item.id, timeUnit: item.time_unit })
    }
    close()
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={close}
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity duration-200 md:hidden",
          visible ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl transition-transform duration-200 md:hidden",
          visible ? "translate-y-0" : "translate-y-full",
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-black/10" />
        </div>

        <div className="px-4 pb-2 pt-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#a9bab3] mb-3">
            Ancestry
          </h3>

          {/* Current item */}
          <div className="mb-2 px-3 py-2 rounded-lg bg-[#202945]/5">
            <span className="text-[10px] uppercase tracking-wide text-[#a9bab3] font-medium">
              {TIME_UNIT_LABELS[item.time_unit]}
            </span>
            <p className="text-sm text-[#202945] font-medium mt-0.5">{item.title}</p>
          </div>

          {ancestors.length === 0 ? (
            <p className="text-sm text-[#a9bab3] text-center py-4">No parent set</p>
          ) : (
            <div className="space-y-2">
              {ancestors.map((ancestor, i) => (
                <div
                  key={ancestor.id}
                  className="flex items-start gap-2 px-3 py-2 rounded-lg bg-black/[0.03] border border-black/5"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] uppercase tracking-wide text-[#a9bab3] font-medium">
                      {TIME_UNIT_LABELS[ancestor.time_unit]}
                    </span>
                    <p className="text-sm text-[#202945] mt-0.5 truncate">{ancestor.title}</p>
                  </div>
                  {i === 0 && (
                    <button
                      onClick={() => handleUnlink(ancestor.id)}
                      disabled={unsetParent.isPending}
                      className="flex-none text-xs text-red-400 hover:text-red-600 transition-colors mt-1 px-2 py-0.5 rounded border border-red-200 hover:border-red-400"
                    >
                      Unlink
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="h-safe-area-inset-bottom pb-4" />
        </div>
      </div>
    </>,
    document.body,
  )
}
