import axiosInstance from './axiosInstance'
import type { Agent, CreateAgentPayload } from '@/types'

export const getAgentsApi = async (): Promise<Agent[]> => {
  const response = await axiosInstance.get<Agent[]>('/agents/')
  return response.data
}

export const getAgentApi = async (agentId: string): Promise<Agent> => {
  const response = await axiosInstance.get<Agent>(`/agents/${agentId}`)
  return response.data
}

export const createAgentApi = async (payload: CreateAgentPayload): Promise<Agent> => {
  const response = await axiosInstance.post<Agent>('/agents/', payload)
  return response.data
}

export const updateAgentApi = async (agentId: string, payload: Partial<CreateAgentPayload>): Promise<Agent> => {
  const response = await axiosInstance.put<Agent>(`/agents/${agentId}`, payload)
  return response.data
}

export const deleteAgentApi = async (agentId: string): Promise<void> => {
  await axiosInstance.delete(`/agents/${agentId}`)
}

export const chatAgentApi = async (agentId: string, message: string) => {
  const response = await axiosInstance.post(`/agents/${agentId}/chat`, { message })
  return response.data
}
