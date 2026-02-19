import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"
import { FlowBoard } from "@/components/FlowBoard"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AppSection } from "@/types"

export function DashboardPage() {
  const { user, signOut } = useAuth()
  const [section, setSection] = useState<AppSection>("present")

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* App header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-6">
          <span className="text-base font-semibold tracking-tight">Flow-Do</span>

          {/* Section toggle */}
          <nav className="flex items-center gap-1">
            {(["present", "vision"] as AppSection[]).map((s) => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={cn(
                  "px-3 py-1 rounded-md text-sm transition-colors duration-150 capitalize",
                  section === s
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">{user?.email}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      {/* Section content */}
      <main className="flex-1 overflow-hidden">
        {section === "present" ? (
          <FlowBoard />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground/50">
              Vision — coming soon
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
