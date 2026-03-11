import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import './index.css'
import './globals.css'
import App from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,       // 30s before auto-refetch
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// StrictMode removed — causes Socket.IO double-connect issues
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster position="bottom-right" richColors closeButton />
    {/* DevTools only loads in development builds */}
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>
)

