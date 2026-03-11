/**
 * Workflow React Query hooks
 * Source of truth for all workflow data fetching —
 * replaces manual isLoading/error state in workflowStore.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getWorkflowsApi,
  getWorkflowApi,
  createWorkflowApi,
  updateWorkflowApi,
  deleteWorkflowApi,
} from '@/api/workflows'
import type { CreateWorkflowPayload, UpdateWorkflowPayload } from '@/types'

export const WORKFLOWS_KEY = ['workflows'] as const

export function useWorkflows() {
  return useQuery({
    queryKey: WORKFLOWS_KEY,
    queryFn: getWorkflowsApi,
  })
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: [...WORKFLOWS_KEY, id],
    queryFn: () => getWorkflowApi(id),
    enabled: Boolean(id),
  })
}

export function useCreateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateWorkflowPayload) => createWorkflowApi(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  })
}

export function useUpdateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWorkflowPayload }) =>
      updateWorkflowApi(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  })
}

export function useDeleteWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteWorkflowApi(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: WORKFLOWS_KEY }),
  })
}
