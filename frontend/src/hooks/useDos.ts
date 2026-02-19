import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Do, TimeUnit } from "@/types"

export function useDos(timeUnit: TimeUnit) {
  return useQuery({
    queryKey: ["dos", timeUnit],
    queryFn: async () => {
      const { data } = await api.get<Do[]>("/api/v1/dos", {
        params: { time_unit: timeUnit },
      })
      return data
    },
  })
}

export function useCreateDo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { title: string; time_unit: TimeUnit }) => {
      const { data } = await api.post<Do>("/api/v1/dos", payload)
      return data
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["dos", variables.time_unit] })
    },
  })
}

export function useToggleDo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      timeUnit,
      completed,
    }: {
      id: string
      timeUnit: TimeUnit
      completed: boolean
    }) => {
      const { data } = await api.patch<Do>(`/api/v1/dos/${id}`, {
        completed,
        completed_at: completed ? new Date().toISOString() : null,
      })
      return { data, timeUnit }
    },
    onSuccess: ({ timeUnit }) => {
      void queryClient.invalidateQueries({ queryKey: ["dos", timeUnit] })
    },
  })
}

export function useDeleteDo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, timeUnit }: { id: string; timeUnit: TimeUnit }) => {
      await api.delete(`/api/v1/dos/${id}`)
      return timeUnit
    },
    onSuccess: (timeUnit) => {
      void queryClient.invalidateQueries({ queryKey: ["dos", timeUnit] })
    },
  })
}
