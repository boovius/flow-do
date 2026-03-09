import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { FlowBoard, VISION_UNITS } from "@/components/FlowBoard"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { TimeUnit } from "@/types"

function getInitialFocused(): TimeUnit | null {
  if (typeof window !== "undefined" && window.innerWidth < 768) return "today"
  return null
}

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const [focused, setFocused] = useState<TimeUnit | null>(getInitialFocused)
  const [doFilter, setDoFilter] = useState<"all" | "atomic" | "maintenance">("all")
  const [hideDone, setHideDone] = useState(false)

  const isVision = focused !== null && VISION_UNITS.has(focused)

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* App header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-6">
          <span className="text-base font-semibold tracking-tight">Flow-Do</span>

          {/* Section toggle — desktop only; mobile uses the tab bar in FlowBoard */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setFocused(null)}
              className={cn(
                "px-3 py-1 rounded-md text-sm transition-colors duration-150 capitalize",
                !isVision
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Present
            </button>
            <button
              onClick={() => setFocused("year")}
              className={cn(
                "px-3 py-1 rounded-md text-sm transition-colors duration-150 capitalize",
                isVision
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Vision
            </button>
            <button
              onClick={() => setDoFilter((v) => v === "atomic" ? "all" : "atomic")}
              className={cn(
                "px-3 py-1 rounded-md text-sm transition-colors duration-150",
                doFilter === "atomic"
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Atomic
            </button>
            <button
              onClick={() => setDoFilter((v) => v === "maintenance" ? "all" : "maintenance")}
              className={cn(
                "px-3 py-1 rounded-md text-sm transition-colors duration-150",
                doFilter === "maintenance"
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Maintenance
            </button>
            <button
              onClick={() => setHideDone((v) => !v)}
              className={cn(
                "px-3 py-1 rounded-md text-sm transition-colors duration-150",
                hideDone
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Hide done
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <FlowBoard focused={focused} onFocusChange={setFocused} doFilter={doFilter} hideDone={hideDone} />
      </main>
    </div>
  )
}
