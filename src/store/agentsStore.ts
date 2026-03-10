import { create } from 'zustand'
import type { Agent, CreateAgentPayload } from '@/types'
import { getAgentsApi, createAgentApi, deleteAgentApi } from '@/api/agents'

interface AgentsState {
  agents: Agent[]
  isLoading: boolean
  error: string | null
  fetchAgents: () => Promise<void>
  createAgent: (payload: CreateAgentPayload) => Promise<Agent>
  deleteAgent: (agentId: string) => Promise<void>
}

export const useAgentsStore = create<AgentsState>((set, get) => ({
  agents: [],
  isLoading: false,
  error: null,

  fetchAgents: async () => {
    set({ isLoading: true, error: null })
    try {
      const agents = await getAgentsApi()
      set({ agents, isLoading: false })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch agents'
      set({ error: message, isLoading: false })
    }
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
