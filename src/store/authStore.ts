import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, AuthResponse } from '@/types'
import { loginApi } from '@/api/auth'

interface AuthState {
  user: User | null
  token: string | null
  /** Strictly true only when token is present — derived on rehydration */
  isAuthenticated: boolean
  /** True after Zustand persist has finished rehydrating from localStorage */
  isRehydrated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setAuth: (data: AuthResponse) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isRehydrated: false,
      isLoading: false,
      error: null,

      setAuth: (data: AuthResponse) => {
        localStorage.setItem('access_token', data.access_token)
        set({
          user: data.user,
          token: data.access_token,
          isAuthenticated: true,
          error: null,
        })
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const data = await loginApi(email, password)
          localStorage.setItem('access_token', data.access_token)
          set({
            user: data.user,
            token: data.access_token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          })
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Login failed'
          set({ isLoading: false, error: message, isAuthenticated: false })
          throw err
        }
      },

      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('user')
        localStorage.removeItem('auth-storage')
        set({ user: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: 'auth-storage',
      // Only persist these fields; isRehydrated is always reset to false on fresh load
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: Boolean(state.token), // strictly derived from token presence
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Enforce: isAuthenticated must be backed by a real token
          state.isAuthenticated = Boolean(state.token)
          state.isRehydrated = true
        }
      },
    }
  )
)
