import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * Guards routes from unauthenticated access.
 * Waits for Zustand to finish rehydrating from localStorage before deciding
 * to redirect — prevents the race condition that causes an infinite redirect loop.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isRehydrated } = useAuthStore()

  // Still loading persisted state — show nothing (or a spinner) to avoid flash-redirect
  if (!isRehydrated) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
