export type TimeUnit = "today" | "week" | "month" | "season" | "year" | "multi_year"

export type DoType = "normal" | "maintenance"

export type AppSection = "present" | "vision"

export interface Do {
  id: string
  user_id: string
  title: string
  time_unit: TimeUnit
  do_type: DoType
  completed: boolean
  completed_at: string | null
  days_in_unit: number
  flow_count: number
  completion_count: number
  created_at: string
  updated_at: string
}
