import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://192.168.1.40:8000'

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: attach Bearer token from localStorage
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: handle 401 globally
// CRITICAL: Only redirect when we are NOT already on /login.
// Without this guard, a 401 from the login request itself triggers a full
// page reload that re-renders LoginPage → redirect back to / → infinite loop.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !window.location.pathname.includes('/login')
    ) {
      // logout() clears localStorage AND the Zustand persisted key, so
      // ProtectedRoute will see isAuthenticated:false after the reload.
      useAuthStore.getState().logout()
      window.location.replace('/login')
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
export { BASE_URL }
