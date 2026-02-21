import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Do, DoType, TimeUnit } from "@/types"

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
    mutationFn: async (payload: { title: string; time_unit: TimeUnit; do_type?: DoType }) => {
      const { data } = await api.post<Do>("/api/v1/dos", payload)
      return data
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["dos", variables.time_unit] })
    },
  })
}

export function useLogMaintenance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; timeUnit: TimeUnit }) => {
      const { data } = await api.post<Do>(`/api/v1/dos/${id}/log`, {})
      return data
    },
    onMutate: async ({ id, timeUnit }) => {
      await queryClient.cancelQueries({ queryKey: ["dos", timeUnit] })
      const previous = queryClient.getQueryData<Do[]>(["dos", timeUnit])
      queryClient.setQueryData<Do[]>(["dos", timeUnit], (old) =>
        old?.map((d) =>
          d.id === id ? { ...d, completion_count: d.completion_count + 1 } : d,
        ) ?? [],
      )
      return { previous, timeUnit }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(["dos", context.timeUnit], context.previous)
      }
    },
    onSettled: (_data, _err, { timeUnit }) => {
      void queryClient.invalidateQueries({ queryKey: ["dos", timeUnit] })
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

export function useMoveDo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      toUnit,
    }: {
      id: string
      fromUnit: TimeUnit
      toUnit: TimeUnit
    }) => {
      const { data } = await api.patch<Do>(`/api/v1/dos/${id}`, {
        time_unit: toUnit,
      })
      return data
    },
    onMutate: async ({ id, fromUnit, toUnit }) => {
      // Cancel any in-flight refetches for affected columns
      await queryClient.cancelQueries({ queryKey: ["dos", fromUnit] })
      await queryClient.cancelQueries({ queryKey: ["dos", toUnit] })

      // Snapshot current state for rollback
      const previousFrom = queryClient.getQueryData<Do[]>(["dos", fromUnit])
      const previousTo = queryClient.getQueryData<Do[]>(["dos", toUnit])

      // Optimistically move the item
      const movingItem = previousFrom?.find((d) => d.id === id)
      if (movingItem) {
        queryClient.setQueryData<Do[]>(["dos", fromUnit], (old) =>
          old?.filter((d) => d.id !== id) ?? [],
        )
        queryClient.setQueryData<Do[]>(["dos", toUnit], (old) => [
          ...(old ?? []),
          { ...movingItem, time_unit: toUnit },
        ])
      }

      return { previousFrom, previousTo, fromUnit, toUnit }
    },
    onError: (_err, _vars, context) => {
      // Roll back both columns on failure
      if (context?.previousFrom !== undefined) {
        queryClient.setQueryData(["dos", context.fromUnit], context.previousFrom)
      }
      if (context?.previousTo !== undefined) {
        queryClient.setQueryData(["dos", context.toUnit], context.previousTo)
      }
    },
    onSettled: (_data, _err, { fromUnit, toUnit }) => {
      void queryClient.invalidateQueries({ queryKey: ["dos", fromUnit] })
      void queryClient.invalidateQueries({ queryKey: ["dos", toUnit] })
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
