/**
 * Agent React Query hooks
 * Source of truth for all agent data fetching —
 * replaces manual isLoading/error state in agentsStore.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getAgentsApi,
  getAgentApi,
  createAgentApi,
  updateAgentApi,
  deleteAgentApi,
} from '@/api/agents'
import type { CreateAgentPayload } from '@/types'

export const AGENTS_KEY = ['agents'] as const

export function useAgents() {
  return useQuery({
    queryKey: AGENTS_KEY,
    queryFn: getAgentsApi,
  })
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: [...AGENTS_KEY, id],
    queryFn: () => getAgentApi(id),
    enabled: Boolean(id),
  })
}

export function useCreateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAgentPayload) => createAgentApi(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENTS_KEY }),
  })
}

export function useUpdateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateAgentPayload> }) =>
      updateAgentApi(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENTS_KEY }),
  })
}

export function useDeleteAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAgentApi(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: AGENTS_KEY }),
  })
}
