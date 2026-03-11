/**
 * App.tsx — root component
 *
 * Responsibilities:
 *  • Mount BrowserRouter
 *  • Load route config from src/routes/
 *  • Wrap all routes in Suspense (lazy chunk loading)
 *
 * Do NOT add business logic here — keep it as a pure shell.
 */
import { Suspense } from 'react'
import { BrowserRouter, useRoutes } from 'react-router-dom'
import { appRoutes } from '@/routes'

/** Full-screen loading spinner shown while a lazy page chunk loads */
function PageLoader() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
        <p className="text-xs text-slate-400 font-medium tracking-wide">Loading…</p>
      </div>
    </div>
  )
}

/** Inner component — must live inside <BrowserRouter> to use useRoutes() */
function AppRoutes() {
  const element = useRoutes(appRoutes)
  return element
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <AppRoutes />
      </Suspense>
    </BrowserRouter>
  )
}
