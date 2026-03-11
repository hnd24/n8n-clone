/**
 * Agent React Query hooks
 * Source of truth for all agent data fetching —
 * replaces manual isLoading/error state in agentsStore.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getAgentsApi,
  getAgentApi,
  createAgentApi,
  updateAgentApi,
  deleteAgentApi,
} from '@/api/agents'
import type { CreateAgentPayload } from '@/types'

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

export const AGENTS_KEY = ['agents'] as const

export function useAgents() {
  return useQuery({
    queryKey: AGENTS_KEY,
    queryFn: getAgentsApi,
    meta: { errorMessage: 'Không thể tải danh sách agent' },
  })
}

export function useAgent(id: string) {
  return useQuery({
    queryKey: [...AGENTS_KEY, id],
    queryFn: () => getAgentApi(id),
    enabled: Boolean(id),
    meta: { errorMessage: 'Không thể tải agent' },
  })
}

export function useCreateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAgentPayload) => createAgentApi(payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: AGENTS_KEY })
      toast.success('Agent đã được tạo', {
        description: `"${data.name}" đã được thêm vào hệ thống.`,
      })
    },
    onError: (error) => {
      toast.error('Tạo agent thất bại', {
        description: getErrorMessage(error, 'Không thể tạo agent, vui lòng thử lại.'),
      })
    },
  })
}

export function useUpdateAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateAgentPayload> }) =>
      updateAgentApi(id, payload),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: AGENTS_KEY })
      toast.success('Agent đã được cập nhật', {
        description: `"${data.name}" đã được lưu thành công.`,
      })
    },
    onError: (error) => {
      toast.error('Cập nhật agent thất bại', {
        description: getErrorMessage(error, 'Không thể cập nhật agent, vui lòng thử lại.'),
      })
    },
  })
}

export function useDeleteAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAgentApi(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: AGENTS_KEY })
      toast.success('Agent đã được xoá')
    },
    onError: (error) => {
      toast.error('Xoá agent thất bại', {
        description: getErrorMessage(error, 'Không thể xoá agent, vui lòng thử lại.'),
      })
    },
  })
}
