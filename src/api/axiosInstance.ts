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
// Critical: we must clear BOTH localStorage AND the Zustand persisted state
// before redirecting, otherwise Zustand rehydrates isAuthenticated: true on
// reload and LoginPage immediately bounces back to "/" — creating an infinite loop.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear localStorage auth data
      localStorage.removeItem('access_token')
      localStorage.removeItem('user')
      // Also clear the Zustand persisted state key to prevent rehydration loop
      localStorage.removeItem('auth-storage')
      // Reset auth store state in memory as well
      useAuthStore.getState().logout()
      // Use React Router navigate via window is fine here since we also
      // reset state — the loop is broken because isAuthenticated will be false
      window.location.replace('/login')
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
export { BASE_URL }
