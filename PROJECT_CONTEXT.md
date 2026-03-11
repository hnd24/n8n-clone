# PROJECT_CONTEXT.md
> Machine-readable project context for AI coding assistants (Gemini, Copilot, Cursor, etc.)
> Last updated: 2026-03-11

---

## Identity

| Field | Value |
|---|---|
| Project Name | n8n Clone |
| Type | React SPA (Single Page Application) |
| Purpose | Visual drag-and-drop AI workflow builder |
| Backend | AgentCrew (`../AgentCrew-main`) — FastAPI + python-socketio |
| Backend URL | `http://192.168.1.40:8000` (env: `VITE_BACKEND_URL`) |

---

## Critical Constraints

- **Socket.IO**: Backend `connect(sid, environ)` handler does NOT accept `auth` param. Client MUST connect without `auth: { token }` and without `withCredentials: true`. Token is only used for REST API calls.
- **Routing decisions**: Backend agents output `{"next_agents": ["<UUID>"], ...}`. The UUID must be an exact agent ID from the backend — NOT agent names. Frontend injects correct UUIDs into the coordinator's `system_prompt` before each run (`injectCoordinatorContext` in DashboardPage).
- **Auth guard**: `ProtectedRoute` waits for `isRehydrated` from `authStore` before redirecting. Never redirect based on `isAuthenticated` alone.
- **Axios 401**: The interceptor only redirects to `/login` if `window.location.pathname !== '/login'` to prevent infinite loops.

---

## Key Files & Their Roles

| File | Role |
|---|---|
| `src/main.tsx` | App entry: QueryClient, Toaster, ReactQueryDevtools |
| `src/App.tsx` | BrowserRouter + Suspense shell — no business logic |
| `src/routes/index.tsx` | All route definitions (lazy, public, private) |
| `src/api/axiosInstance.ts` | Axios singleton with auth + 401 interceptor |
| `src/api/agents.ts` | REST calls: GET/POST/PUT/DELETE /agents/ |
| `src/api/workflows.ts` | REST calls: GET/POST/PUT/DELETE /workflows/ |
| `src/hooks/useSocket.ts` | Socket.IO client singleton, event wiring to socketStore |
| `src/hooks/queries/useAgentQueries.ts` | TanStack Query hooks for agents |
| `src/hooks/queries/useWorkflowQueries.ts` | TanStack Query hooks for workflows |
| `src/store/authStore.ts` | Zustand: token, user, isAuthenticated, isRehydrated |
| `src/store/socketStore.ts` | Zustand: streaming blocks, currentNodeId, isStreaming |
| `src/store/workflowStore.ts` | Zustand: ReactFlow nodes[], edges[] |
| `src/pages/DashboardPage.tsx` | Main page: canvas + sidebar + streaming panel + run logic |
| `src/pages/LoginPage.tsx` | Login form + POST /auth/token |
| `src/components/canvas/WorkflowCanvas.tsx` | ReactFlow canvas — enriches nodes with isActive/isCompleted |
| `src/components/nodes/AgentNode.tsx` | Custom node: highlights when isActive (blue pulse + spinner) |
| `src/components/streaming/StreamingPanel.tsx` | Live output: Markdown render + RoutingDecisionBadge accordion |

---

## Socket.IO Event Map

| Direction | Event | Payload | Handler |
|---|---|---|---|
| **emit** | `workflow_chat` | `{ workflow_id, message }` | `useSocket.emitWorkflowChat()` |
| **emit** | `agent_chat` | `{ agent_id, message }` | `useSocket.emitAgentChat()` |
| **on** | `node_started` | `{ node_id, node_type, turn }` | `socketStore.openNodeBlock()` |
| **on** | `workflow_agent_started` | `{ node_id, agent_name }` | `socketStore.setAgentTyping()` |
| **on** | `workflow_agent_chunk` | `{ node_id, data: [chunk, full] }` | `socketStore.appendChunk()` |
| **on** | `workflow_agent_completed` | `{ node_id, agent_name }` | `socketStore.closeAgentBlock()` |
| **on** | `node_completed` | `{ node_id, turn }` | `socketStore.closeNodeBlock()` |
| **on** | `workflow_completed` | `{ state: { final_answer } }` | `socketStore.setWorkflowCompleted()` |
| **on** | `error` | `{ message }` | `socketStore.addError()` |

---

## State Management Summary

```
┌─────────────────────────────────────────────────────────┐
│  TanStack Query (server state)                          │
│  • useAgents(), useWorkflows()                          │
│  • useCreateAgent(), useUpdateAgent(), useDeleteAgent() │
│  • useCreateWorkflow(), useUpdateWorkflow()...           │
│  • Automatic cache invalidation on mutations            │
└─────────────────────────┬───────────────────────────────┘
                          │ (local UI state only in Zustand)
┌─────────────────────────▼───────────────────────────────┐
│  Zustand stores (client state)                          │
│  • authStore    — JWT, user profile, rehydration flag   │
│  • workflowStore — ReactFlow nodes/edges                │
│  • socketStore  — streaming blocks, currentNodeId       │
└─────────────────────────────────────────────────────────┘
```

---

## API Endpoints (Backend)

| Method | Path | Description |
|---|---|---|
| POST | `/auth/token` | Login (form: username, password) |
| GET | `/me` | Current user |
| GET | `/agents/` | List agents |
| POST | `/agents/` | Create agent |
| PUT | `/agents/:id` | Update agent |
| DELETE | `/agents/:id` | Delete agent |
| GET | `/workflows/` | List workflows |
| POST | `/workflows/` | Create workflow (`{ name, steps: string[] }`) |
| PUT | `/workflows/:id` | Update workflow |
| DELETE | `/workflows/:id` | Delete workflow |

`steps` field = **array of agent UUIDs** in execution order.

---

## Routing Architecture

```
BrowserRouter
└─ Suspense (PageLoader spinner)
   ├─ /login          → LoginPage          [lazy, public]
   ├─ /               → ProtectedRoute
   │                      └─ DashboardPage  [lazy, private]
   └─ *               → <Navigate to="/" />
```

**Adding a route:** Edit `src/routes/index.tsx` only. `App.tsx` auto-picks up changes.

---

## Node Activation Flow (Canvas Highlight)

```
Socket event node_started { node_id }
  → socketStore.setCurrentNodeId(node_id)
  → socketStore.openNodeBlock(node_id, turn)
  → DashboardPage.activeNodeIds = blocks.filter(typing).map(nodeId)
  → WorkflowCanvas.enrichedNodes: isActive = activeNodeIds.includes(agentId)
  → AgentNode: border-blue-400 + animate-pulse + Loader2 spinner
```

---

## Common Patterns

### API error message extraction
```ts
const msg = error?.response?.data?.message
         ?? error?.response?.data?.detail
         ?? error?.message
         ?? 'Lỗi không xác định'
```

### Fuzzy node ID resolution (socketStore)
Backend sometimes emits agent name instead of UUID as `node_id`. `resolveNodeId()` in socketStore scans existing blocks by `agentName` to find the canonical UUID.

### Coordinator context injection
Before each workflow run, `injectCoordinatorContext()` in DashboardPage:
1. Finds coordinator (node with no incoming ReactFlow edges)
2. BFS to find all downstream agents
3. Patches coordinator `system_prompt` via `PUT /agents/:id` with exact agent UUIDs
4. Strips stale injection from previous runs (HTML comment markers)
