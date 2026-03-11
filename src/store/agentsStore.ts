/**
 * agentsStore.ts — Minimal canvas-drag state
 *
 * Data fetching (agent list, loading states, errors) has been moved to
 * React Query hooks in src/hooks/queries/useAgentQueries.ts.
 * This store only serves as a thin cache if components need to share
 * agent data across the component tree without prop-drilling.
 * Prefer using `useAgents()` from the query hooks directly.
 */
import { create } from 'zustand'
import type { Agent, CreateAgentPayload } from '@/types'
import { createAgentApi, deleteAgentApi } from '@/api/agents'

interface AgentsState {
  /** @deprecated Use useAgents() query hook instead */
  agents: Agent[]
  /** @deprecated Use useAgents() query hook instead */
  fetchAgents: () => Promise<void>
  createAgent: (payload: CreateAgentPayload) => Promise<Agent>
  deleteAgent: (agentId: string) => Promise<void>
}

export const useAgentsStore = create<AgentsState>((set, get) => ({
  agents: [],

  // Kept for legacy callers; React Query is now the source of truth
  fetchAgents: async () => {
    const { getAgentsApi } = await import('@/api/agents')
    const agents = await getAgentsApi()
    set({ agents })
  },

  createAgent: async (payload: CreateAgentPayload) => {
    const agent = await createAgentApi(payload)
    set((state) => ({ agents: [...state.agents, agent] }))
    return agent
  },

  deleteAgent: async (agentId: string) => {
    await deleteAgentApi(agentId)
    set((state) => ({ agents: state.agents.filter((a) => a.id !== agentId) }))
    const { agents } = get()
    set({ agents })
  },
}))
