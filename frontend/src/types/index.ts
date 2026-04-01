export type TimeUnit = "today" | "week" | "month" | "season" | "year" | "multi_year"

export type DoType = "normal" | "maintenance"

export type AppSection = "present" | "vision"

export interface SortOption {
  key: "created_at" | "name"
  dir: "asc" | "desc"
}

export interface Do {
  id: string
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
  parent_id: string | null
  is_today_priority: boolean
}

export interface MaintenanceLog {
  id: string
  do_id: string
  logged_at: string
}
