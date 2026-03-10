# PROJECT CONTEXT
*This document acts as a rapid-onboarding guide for AI reviewers to understand the core logic mechanisms controlling the Clone-n8n project without parsing all files.*

## 1. `src/hooks/useSocket.ts` (Realtime Connection Manager)
**Role**: Interfaces between the backend (`http://192.168.1.40:8000`) and the UI purely relying on event streams.
- **Connection Strategy**: Instantiates `io()` immediately at the module level (outside the React Component lifecycle). This prevents `StrictMode` development quirks from duplicating websockets or generating race conditions.
- **Configuration**: Strictly obeys backend specs using `transports: ['polling', 'websocket']`, `forceNew: true`, `withCredentials: true` and passes the JWT dynamically into `auth: { token }` and `extraHeaders`.
- **Event Mappings**: 
  1. Captures lifecycle events: `node_started`, `workflow_agent_started`, `workflow_agent_chunk`, `workflow_agent_completed`, `node_completed`, `workflow_completed`.
  2. Aggressively maps these incoming payloads directly into `useSocketStore` methods rather than maintaining local state. (e.g. firing `appendChunk(nodeId, text)` internally groups text to the right UI card).
- **The specific bug**: The connection is returning an obscure `connect_error` in Chromium/Vite despite Postman/cURL working normally.

## 2. `src/store/workflowStore.ts` (ReactFlow Graph State)
**Role**: Decouples the API's array-based `steps: string[]` logic from ReactFlow's complex geometric node logic.
- **Logic Mapping (`setNodesFromSteps`)**: 
  - Takes an inputted array of agent UUIDs (e.g., `["agent_A", "agent_B"]`).
  - Iterates against all known Agents to fetch the agent metadata (using dummy fallbacks if unresolved).
  - Geometrically calculates visual nodes mapping IDs to explicit `x` / `y` offset values on a horizontal line.
  - Automatically draws connection lines (`edges`) between sequential nodes (`target` and `source`).
- **State Persuasion**: When switching from the `WorkflowsTab` to the `CanvasTab`, this file dictates that the layout is entirely refreshed based on the saved API data.

## 3. `src/api/axiosInstance.ts` (HTTP Gateway)
**Role**: Handles all standard HTTP requests in a uniform manner enforcing auth constraints globally.
- **Base Routing**: Hardcoded tightly to `http://192.168.1.40:8000`.
- **Interceptors**:
  - **Request**: Grabs `access_token` from `localStorage` before every single API call out, appending the string standard `Bearer <token>`.
  - **Response**: Listens primarily for status code `401 Unauthorized`. If it drops, it unilaterally flushes validation tokens from `localStorage` and forces `window.location.href = '/login'`, gracefully mitigating stale session data crashes. 
