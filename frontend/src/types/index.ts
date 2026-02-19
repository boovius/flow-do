export type TimeUnit = "today" | "week" | "month" | "season"

export type AppSection = "present" | "vision"

export interface Do {
  id: string
  user_id: string
  title: string
  time_unit: TimeUnit
  completed: boolean
  completed_at: string | null
  days_in_unit: number
  flow_count: number
  created_at: string
  updated_at: string
}
