import axiosInstance from './axiosInstance'
import type { AuthResponse, User } from '@/types'

export const loginApi = async (email: string, password: string): Promise<AuthResponse> => {
  const formData = new URLSearchParams()
  formData.append('username', email)
  formData.append('password', password)

  const response = await axiosInstance.post<AuthResponse>('/auth/token', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return response.data
}

export const getMeApi = async (): Promise<User> => {
  const response = await axiosInstance.get<User>('/me')
  return response.data
}

export const setupAdminApi = async (name: string, email: string, password: string) => {
  const response = await axiosInstance.post('/users/setup-admin-first-time', {
    name,
    email,
    password,
  })
  return response.data
}
