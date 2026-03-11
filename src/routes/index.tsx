/**
 * src/routes/index.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized route configuration for the entire app.
 *
 * Structure:
 *  PUBLIC  → /login           (no auth required)
 *  PRIVATE → /                (dashboard — canvas + workflow list)
 *            /*               → redirect to /
 *
 * Conventions for adding new routes:
 *  1. Create the page in src/pages/YourPage.tsx
 *  2. Add a lazy() import below in the LAZY IMPORTS section
 *  3. Add the <Route> entry inside the appropriate section
 *  4. If private, nest it inside the ProtectedRoute element
 *
 * All page components are lazily loaded (code-split) to keep the
 * initial bundle small.  The global <Suspense> in App.tsx shows a
 * spinner while any chunk is loading.
 */

import { lazy } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import ProtectedRoute from '@/components/ProtectedRoute'

// ── Lazy page imports (each becomes its own JS chunk) ──────────────────────
const LoginPage     = lazy(() => import('@/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))

// ── Route definitions ───────────────────────────────────────────────────────

/** Public routes — accessible without authentication */
export const publicRoutes: RouteObject[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
]

/** Private routes — wrapped by ProtectedRoute (auth + rehydration guard) */
export const privateRoutes: RouteObject[] = [
  {
    // Root layout guard — all children inherit auth protection
    path: '/',
    element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
  },
]

/** Catch-all — unknown paths redirect to dashboard */
export const fallbackRoute: RouteObject = {
  path: '*',
  element: <Navigate to="/" replace />,
}

/** All routes combined — consumed by <Routes> in App.tsx */
export const appRoutes: RouteObject[] = [
  ...publicRoutes,
  ...privateRoutes,
  fallbackRoute,
]
