/**
 * workflowStore.ts — Canvas-only state
 *
 * Data fetching (workflows list, loading states, errors) has been moved to
 * React Query hooks in src/hooks/queries/useWorkflowQueries.ts.
 * This store only manages the ReactFlow canvas graph state and the currently
 * selected workflow.
 */
import { create } from 'zustand'
import type { Node, Edge } from 'reactflow'
import type { Workflow, CreateWorkflowPayload, Agent } from '@/types'

// Layout constants
const NODE_WIDTH = 280
const NODE_H_GAP = 60
const NODE_START_X = 80
const NODE_Y = 180

/** Build ReactFlow nodes from an ordered list of agents */
function buildNodesAndEdges(agents: Agent[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = agents.map((agent, index) => ({
    id: `agent-${agent.id}-${index}`,
    type: 'agentNode',
    position: { x: NODE_START_X + index * (NODE_WIDTH + NODE_H_GAP), y: NODE_Y },
    data: { agent },
  }))

  const edges: Edge[] = nodes.slice(0, -1).map((node, index) => ({
    id: `edge-${index}`,
    source: node.id,
    target: nodes[index + 1].id,
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#7c3aed', strokeWidth: 2 },
  }))

  return { nodes, edges }
}

interface WorkflowState {
  selectedWorkflow: Workflow | null
  nodes: Node[]
  edges: Edge[]
  selectWorkflow: (workflow: Workflow | null) => void
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  addAgentToCanvas: (agent: Agent, position?: { x: number; y: number }) => void
  /** Convert a workflow's steps (agent UUIDs) + agent list into ReactFlow nodes/edges */
  setNodesFromSteps: (steps: string[], agents: Agent[]) => void
  /** Load a workflow onto the canvas — agents can be passed or resolved from steps */
  loadWorkflowToCanvas: (workflow: Workflow, agents: Agent[]) => void
  clearCanvas: () => void
  // ── Legacy compat: kept so DashboardPage's handleSaveWorkflow still compiles
  /** @deprecated use useCreateWorkflow() mutation directly */
  createWorkflow: (payload: CreateWorkflowPayload) => Promise<Workflow>
}

let nodeCounter = 0

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  selectedWorkflow: null,
  nodes: [],
  edges: [],

  selectWorkflow: (workflow) => set({ selectedWorkflow: workflow }),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  // ── Core: convert steps (UUID array) to ReactFlow nodes/edges ─────────
  setNodesFromSteps: (steps: string[], agents: Agent[]) => {
    if (!steps?.length) {
      set({ nodes: [], edges: [] })
      return
    }

    const agentMap = new Map<string, Agent>(
      (agents ?? []).filter(Boolean).map((a) => [a.id, a])
    )

    const orderedAgents: Agent[] = steps.map((agentId, index) => {
      const found = agentMap.get(agentId)
      return found ?? {
        id: agentId,
        owner_user_id: '',
        name: `Agent #${index + 1}`,
        description: `ID: ${agentId.slice(0, 8)}...`,
        system_prompt: '',
        model: 'gemini-2.5-flash',
        tools: [],
        temperature: 0.5,
        config: {},
      }
    })

    const { nodes, edges } = buildNodesAndEdges(orderedAgents)
    set({ nodes, edges })
  },

  addAgentToCanvas: (agent, position) => {
    nodeCounter++
    const { nodes } = get()
    const existingCount = nodes.length
    const defaultPos = position ?? {
      x: NODE_START_X + (existingCount % 4) * (NODE_WIDTH + NODE_H_GAP),
      y: NODE_Y + Math.floor(existingCount / 4) * 220,
    }

    const newNode: Node = {
      id: `agent-${agent.id}-${nodeCounter}`,
      type: 'agentNode',
      position: defaultPos,
      data: { agent: agent ?? {} },
    }

    set((state) => ({ nodes: [...state.nodes, newNode] }))
  },

  loadWorkflowToCanvas: (workflow, agents) => {
    if (!workflow?.steps?.length) {
      set({ nodes: [], edges: [], selectedWorkflow: workflow })
      return
    }
    get().setNodesFromSteps(workflow.steps, agents ?? [])
    set({ selectedWorkflow: workflow })
  },

  clearCanvas: () => {
    nodeCounter = 0
    set({ nodes: [], edges: [] })
  },

  // Legacy compat: do not use — use the mutation hook instead
  createWorkflow: async (payload) => {
    const { createWorkflowApi } = await import('@/api/workflows')
    return createWorkflowApi(payload)
  },
}))
