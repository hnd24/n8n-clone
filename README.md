# Clone-n8n Frontend Development

This is the frontend implementation of exactly cloning an n8n-like UI, built strictly according to `API_FLOW_UI.md` specifications.

## 🛠 Technical Stack
- **Framework:** React 18, Vite, TypeScript (SPA architecture).
- **Styling:** Tailwind CSS v4 + native CSS variables (Force Light Mode).
- **UI Components:** Shadcn UI (Radix UI) + custom native HTML equivalents for explicit light colors.
- **Workflow Engine:** ReactFlow (handling node layouts, dragging constraints, custom `AgentNode`).
- **State Management:** Zustand (modules: `authStore`, `agentsStore`, `workflowStore`, `socketStore`).
- **Realtime / Streaming:** Socket.IO Client (`socket.io-client`).
- **HTTP/Fetch:** Axios with global Interceptors handling auth headers and 401 fallbacks.

## 🚨 Current Status & Blockers
**Socket.IO Connection Issue**
The UI streams workflow activity using Socket.IO via `http://192.168.1.40:8000`. 

- **The Issue**: Despite verifying the backend connects perfectly with a standard `curl` or external WS tool (returning `200 OK` with SID and Upgrade requests), the **React Client repeatedly hits `connect_error`**.
- **Efforts taken**: `useSocket.ts` has been heavily iterated (e.g. `transports: ['polling', 'websocket']`, `withCredentials: true`, `forceNew: true`, passing tokens explicitly in `auth` and `extraHeaders`, bypassing React `StrictMode` by using module-level Singletons).
- **Next steps**: Another AI or developer needs to analyze `PROJECT_CONTEXT.md` to spot any missing CORS pre-flight, wrong namespace paths, or obscure Vite/Proxy settings blocking the handshake.

---

## 📂 Project Directory Structure
```text
src/
├── api/                   # Axios instance & specific API caller functions
│   ├── agents.ts          # agent CRUD
│   ├── auth.ts            # auth/login endpoints
│   ├── axiosInstance.ts   # Axios setup (Bearer interceptors)
│   ├── tools.ts           # tool list endpoint
│   └── workflows.ts       # workflow CRUD + execution triggers
├── assets/                # Static assets (React/Vite logos)
├── components/            # React UI Components
│   ├── ProtectedRoute.tsx # Route wrapper for auth checking
│   ├── canvas/            # ReactFlow Logic (WorkflowCanvas)
│   ├── nodes/             # ReactFlow custom node visuals (AgentNode)
│   ├── sidebar/           # Draggable agents list (AgentSidebar)
│   ├── streaming/         # Live output UI & modal triggers (RunWorkflowModal, StreamingPanel)
│   └── ui/                # Shadcn primitives (Card, Button, Dialog, etc.)
├── hooks/                 # Custom React Hooks
│   └── useSocket.ts       # Connects Socket.IO, maps backend events to socketStore
├── store/                 # Zustand state management
│   ├── agentsStore.ts     # Fetched agents library
│   ├── authStore.ts       # JWT + User persist
│   ├── socketStore.ts     # Timeline state for socket streaming (NodeBlock format)
│   └── workflowStore.ts   # ReactFlow Node/Edge conversion & graph state
├── types/                 # Universal TypeScript interfaces (matching API Docs)
├── App.tsx                # React Router & strict route definitions
├── index.css              # Global styles, Shadcn preset variables & CSS overrides
└── main.tsx               # App mount tree (NO StrictMode to avoid module singleton double-calls)
```
