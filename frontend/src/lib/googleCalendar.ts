import { api } from "@/lib/api"

export async function getGoogleCalendarConnectUrl() {
  const { data } = await api.get<{ auth_url: string }>("/api/v1/integrations/google-calendar/connect")
  return data.auth_url
}
