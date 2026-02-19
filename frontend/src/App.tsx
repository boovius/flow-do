import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { AuthPage } from "@/pages/AuthPage"
import { DashboardPage } from "@/pages/DashboardPage"

const queryClient = new QueryClient()

function AppContent() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-muted-foreground text-sm">Loading…</span>
      </div>
    )
  }

  return session ? <DashboardPage /> : <AuthPage />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}
