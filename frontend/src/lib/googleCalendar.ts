import { api } from "@/lib/api"

export interface GoogleCalendarConnectionStatus {
  connected: boolean
  google_email: string | null
  scope: string | null
  token_type: string | null
  expires_at: string | null
}

export async function getGoogleCalendarConnectUrl() {
  const { data } = await api.get<{ auth_url: string }>("/api/v1/integrations/google-calendar/connect")
  return data.auth_url
}

export async function getGoogleCalendarStatus() {
  const { data } = await api.get<GoogleCalendarConnectionStatus>("/api/v1/integrations/google-calendar/status")
  return data
}

export async function disconnectGoogleCalendar() {
  const { data } = await api.post<{ ok: boolean }>("/api/v1/integrations/google-calendar/disconnect", {})
  return data
}
