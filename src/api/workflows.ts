import axiosInstance from './axiosInstance'
import type { Workflow, CreateWorkflowPayload, UpdateWorkflowPayload, WorkflowExecution } from '@/types'

export const getWorkflowsApi = async (): Promise<Workflow[]> => {
  const response = await axiosInstance.get<Workflow[]>('/workflows/')
  return response.data
}

export const getWorkflowApi = async (workflowId: string): Promise<Workflow> => {
  const response = await axiosInstance.get<Workflow>(`/workflows/${workflowId}`)
  return response.data
}

export const createWorkflowApi = async (payload: CreateWorkflowPayload): Promise<Workflow> => {
  const response = await axiosInstance.post<Workflow>('/workflows/', payload)
  return response.data
}

export const updateWorkflowApi = async (workflowId: string, payload: UpdateWorkflowPayload): Promise<Workflow> => {
  const response = await axiosInstance.put<Workflow>(`/workflows/${workflowId}`, payload)
  return response.data
}

export const deleteWorkflowApi = async (workflowId: string): Promise<void> => {
  await axiosInstance.delete(`/workflows/${workflowId}`)
}

export const shareWorkflowApi = async (workflowId: string, sharedWithUserId: string, permission: 'read' | 'edit') => {
  const response = await axiosInstance.post(`/workflows/${workflowId}/share`, {
    shared_with_user_id: sharedWithUserId,
    permission,
  })
  return response.data
}

export const chatWorkflowApi = async (workflowId: string, message: string) => {
  const response = await axiosInstance.post(`/workflows/${workflowId}/chat`, { message })
  return response.data
}

export const runWorkflowApi = async (workflowId: string, message: string) => {
  const response = await axiosInstance.post(`/workflows/${workflowId}/run`, { message })
  return response.data
}

export const getExecutionApi = async (executionId: string): Promise<WorkflowExecution> => {
  const response = await axiosInstance.get<WorkflowExecution>(`/workflows/executions/${executionId}`)
  return response.data
}
