// ─── Auth ─────────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  name: string
  is_admin: boolean
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

// ─── Agent ────────────────────────────────────────────────────────────────
export interface Agent {
  id: string
  owner_user_id: string
  name: string
  description: string
  system_prompt: string
  model: string
  tools: string[]
  temperature: number
  config: Record<string, unknown>
}

export interface CreateAgentPayload {
  name: string
  description?: string
  system_prompt?: string
  model?: string
  tools?: string[]
  temperature?: number
  config?: Record<string, unknown>
}

// ─── Workflow ─────────────────────────────────────────────────────────────
export interface Workflow {
  id: string
  owner_user_id: string
  name: string
  is_public: boolean
  shared_with: string[]
  steps: string[]
  created_at: string
}

export interface CreateWorkflowPayload {
  name: string
  steps: string[]
  is_public?: boolean
}

export interface UpdateWorkflowPayload {
  name?: string
  steps?: string[]
  is_public?: boolean
}

// ─── Workflow Execution ───────────────────────────────────────────────────
export interface WorkflowExecution {
  id: string
  workflow_id: string
  status: 'running' | 'completed' | 'failed'
  context: Record<string, unknown>
}

// ─── Socket.IO Events ─────────────────────────────────────────────────────
export interface SocketNodeStarted {
  node_id: string
  node_type: string
  turn: number
}

export interface SocketAgentStarted {
  node_id: string
  agent_name: string
}

export interface SocketAgentChunk {
  node_id: string
  data: [string, string] // [chunk_text, assistant_response]
}

export interface SocketAgentCompleted {
  node_id: string
  agent_name: string
}

export interface SocketNodeCompleted {
  node_id: string
  turn: number
  result: unknown
}

export interface SocketWorkflowCompleted {
  state: {
    original_task?: string
    allowed_agents?: string[]
    coordinator?: string
    last_coordinator_decision?: {
      next_agents: string[]
      message_to_next: string
      done: boolean
      final_answer: string
    }
    final_answer?: string
    [key: string]: unknown
  }
}

// ─── Streaming Log ────────────────────────────────────────────────────────
export type StreamEventType =
  | 'node_started'
  | 'agent_started'
  | 'chunk'
  | 'agent_completed'
  | 'node_completed'
  | 'workflow_completed'
  | 'error'

export interface StreamLogEntry {
  id: string
  type: StreamEventType
  nodeId?: string
  agentName?: string
  text?: string
  turn?: number
  timestamp: number
  isFinal?: boolean
}

// ─── Tool ─────────────────────────────────────────────────────────────────
export interface Tool {
  name: string
  description?: string
  schema?: Record<string, unknown>
}
