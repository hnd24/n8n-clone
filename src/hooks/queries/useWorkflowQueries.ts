/**
 * Workflow React Query hooks
 * Source of truth for all workflow data fetching —
 * replaces manual isLoading/error state in workflowStore.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getWorkflowsApi,
  getWorkflowApi,
  createWorkflowApi,
  updateWorkflowApi,
  deleteWorkflowApi,
} from '@/api/workflows'
import type { CreateWorkflowPayload, UpdateWorkflowPayload } from '@/types'

// Helper to extract a readable error message from Axios or generic errors
const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object') {
    const axiosMsg = (error as { response?: { data?: { message?: string; detail?: string } } })
      .response?.data?.message
      ?? (error as { response?: { data?: { detail?: string } } })
      .response?.data?.detail
    if (axiosMsg) return axiosMsg
    const errMsg = (error as { message?: string }).message
    if (errMsg) return errMsg
  }
  return fallback
}

export const WORKFLOWS_KEY = ['workflows'] as const

export function useWorkflows() {
  return useQuery({
    queryKey: WORKFLOWS_KEY,
    queryFn: getWorkflowsApi,
    meta: { errorMessage: 'Không thể tải danh sách workflow' },
  })
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: [...WORKFLOWS_KEY, id],
    queryFn: () => getWorkflowApi(id),
    enabled: Boolean(id),
    meta: { errorMessage: 'Không thể tải workflow' },
  })
}

export function useCreateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateWorkflowPayload) => createWorkflowApi(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: WORKFLOWS_KEY })
      toast.success('Workflow đã được tạo', {
        description: `"${data.name}" đã được lưu thành công.`,
      })
    },
    onError: (error) => {
      toast.error('Tạo workflow thất bại', {
        description: getErrorMessage(error, 'Không thể tạo workflow, vui lòng thử lại.'),
      })
    },
  })
}

export function useUpdateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateWorkflowPayload }) =>
      updateWorkflowApi(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WORKFLOWS_KEY })
      toast.success('Workflow đã được cập nhật')
    },
    onError: (error) => {
      toast.error('Cập nhật workflow thất bại', {
        description: getErrorMessage(error, 'Không thể cập nhật workflow, vui lòng thử lại.'),
      })
    },
  })
}

export function useDeleteWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteWorkflowApi(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: WORKFLOWS_KEY })
      toast.success('Workflow đã được xoá')
    },
    onError: (error) => {
      toast.error('Xoá workflow thất bại', {
        description: getErrorMessage(error, 'Không thể xoá workflow, vui lòng thử lại.'),
      })
    },
  })
}
