# n8n Clone — AI Workflow Orchestration Frontend

> Visual drag-and-drop UI for building multi-agent AI workflows powered by the **AgentCrew** backend.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set backend URL
echo "VITE_BACKEND_URL=http://localhost:8000" > .env

# 3. Start dev server
npm run dev        # http://localhost:5173
```

**Backend:** `cd ../AgentCrew-main && uvicorn agent_admin_backend.main:socket_app --port 8000 --reload`

---

## Tech Stack

| Layer | Library | Version |
|---|---|---|
| Framework | React | 18 |
| Build | Vite | 6 |
| Language | TypeScript | 5.8 |
| Styling | Tailwind CSS | 3 |
| Routing | React Router | 6 |
| Server State | TanStack Query | 5 |
| Client State | Zustand | 5 |
| Canvas | ReactFlow | 11 |
| Real-time | Socket.IO Client | 4 |
| HTTP | Axios | 1 |
| Notifications | Sonner | latest |
| Markdown | react-markdown + remark-gfm | latest |

---

## Project Structure

```
src/
├── api/                    # Pure Axios API functions (no React)
│   ├── axiosInstance.ts    # Singleton Axios + 401 interceptor
│   ├── agents.ts           # CRUD for /agents/
│   └── workflows.ts        # CRUD for /workflows/
│
├── components/
│   ├── canvas/             # ReactFlow canvas + toolbar
│   ├── nodes/              # Custom ReactFlow node components (AgentNode)
│   ├── sidebar/            # Agent drag-source sidebar
│   ├── streaming/          # Live output panel (StreamingPanel, RunWorkflowModal)
│   └── ui/                 # Primitive UI components (shadcn-style)
│
├── hooks/
│   ├── queries/            # TanStack Query custom hooks
│   │   ├── useWorkflowQueries.ts
│   │   └── useAgentQueries.ts
│   └── useSocket.ts        # Socket.IO singleton + event wiring
│
├── pages/
│   ├── DashboardPage.tsx   # Main app: canvas + sidebar + streaming panel
│   └── LoginPage.tsx       # Authentication page
│
├── routes/
│   └── index.tsx           # Centralized route config (lazy + protected)
│
├── store/
│   ├── authStore.ts        # Zustand: JWT token, user, isRehydrated
│   ├── workflowStore.ts    # Zustand: ReactFlow nodes/edges state
│   ├── socketStore.ts      # Zustand: streaming blocks, currentNodeId
│   └── agentsStore.ts      # Zustand: agent list (legacy shim)
│
├── types/
│   └── index.ts            # Shared TypeScript interfaces (Agent, Workflow…)
│
├── App.tsx                 # Root: BrowserRouter + useRoutes + Suspense
└── main.tsx                # Entry: QueryClient + Toaster + ReactQueryDevtools
```

---

## Data Flow

```
User Action
  │
  ├─► REST (CRUD)
  │     Axios (axiosInstance.ts)
  │       └─► TanStack Query (hooks/queries/)
  │             └─► Zustand store (if needed for UI state)
  │                   └─► React Component re-render
  │
  └─► Real-time (Workflow Run)
        Socket.IO (hooks/useSocket.ts)
          └─► socketStore (Zustand)
                └─► StreamingPanel re-render (useDeferredValue)
                └─► WorkflowCanvas (activeNodeIds → AgentNode highlight)
```

**Auth flow:**
1. `POST /auth/token` → JWT stored in `localStorage` via `authStore`
2. Axios interceptor injects `Authorization: Bearer <token>` on every request
3. 401 response → `authStore.logout()` + redirect to `/login` (skipped if already on `/login`)
4. `ProtectedRoute` waits for `isRehydrated` before redirecting (prevents flash)

---

## Adding a New Page

1. Create `src/pages/YourPage.tsx`
2. In `src/routes/index.tsx`, add:
   ```tsx
   const YourPage = lazy(() => import('@/pages/YourPage'))
   ```
3. Add a `RouteObject` to `publicRoutes` or `privateRoutes`:
   ```tsx
   { path: '/your-path', element: <YourPage /> }
   ```
4. No changes needed in `App.tsx`.

## Adding a New Data Hook

1. Add the API function to `src/api/yourEntity.ts`
2. Create `src/hooks/queries/useYourEntityQueries.ts`:
   ```ts
   export function useYourEntities() {
     return useQuery({ queryKey: ['your-entity'], queryFn: getYourEntitiesApi })
   }
   export function useCreateYourEntity() {
     const qc = useQueryClient()
     return useMutation({
       mutationFn: createYourEntityApi,
       onSuccess: () => { qc.invalidateQueries({ queryKey: ['your-entity'] }); toast.success('Created!') },
       onError: (err) => toast.error('Failed', { description: getErrorMessage(err) }),
     })
   }
   ```
3. Export from `src/hooks/index.ts`

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `VITE_BACKEND_URL` | Backend API + Socket.IO base URL | `http://localhost:8000` |

---

## Scripts

```bash
npm run dev      # Dev server with HMR
npm run build    # Production bundle
npm run preview  # Preview production build
npm run lint     # ESLint check
```
