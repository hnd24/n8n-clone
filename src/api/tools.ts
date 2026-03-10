import axiosInstance from './axiosInstance'
import type { Tool } from '@/types'

export const getToolsApi = async (): Promise<Tool[]> => {
  const response = await axiosInstance.get<Tool[]>('/tools')
  return response.data
}
