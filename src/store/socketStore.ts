/**
 * socketStore.ts
 * Zustand store for Socket.IO streaming state.
 * Data model follows API_FLOW_UI.md §7 event structures.
 *
 * UI grouping: timeline of NodeBlock items, each containing:
 *   - Agent name + turn
 *   - Accumulated chunk text
 *   - Status: 'typing' | 'done'
 */
import { create } from 'zustand'

// ── Types ─────────────────────────────────────────────────────────────────

export type NodeBlockStatus = 'pending' | 'typing' | 'done'

/** One agent block inside the streaming timeline */
export interface NodeBlock {
  nodeId: string
  agentName: string
  turn: number
  text: string          // accumulated chunk text
  status: NodeBlockStatus
  completedAt?: number
}

/** Final workflow result */
export interface WorkflowResult {
  finalAnswer: string
  completedAt: number
}

interface SocketState {
  isConnected: boolean
  isStreaming: boolean
  currentNodeId: string | null
  /** Ordered streaming blocks — one per node_started event */
  blocks: NodeBlock[]
  /** Final workflow completion result */
  result: WorkflowResult | null
  /** Error message if any */
  error: string | null

  // ── Actions ─────────────────────────────────────────────────────────────
  setConnected: (v: boolean) => void
  setStreaming: (v: boolean) => void
  setCurrentNodeId: (id: string | null) => void

  /** node_started → open a new block */
  openNodeBlock: (nodeId: string, turn: number) => void
  /** workflow_agent_started → mark block as typing */
  setAgentTyping: (nodeId: string, agentName: string) => void
  /** workflow_agent_chunk → append text */
  appendChunk: (nodeId: string, chunk: string) => void
  /** workflow_agent_completed → mark block done */
  closeAgentBlock: (nodeId: string, agentName: string) => void
  /** node_completed → finalise the block */
  closeNodeBlock: (nodeId: string, turn: number) => void
  /** workflow_completed → set final answer */
  setWorkflowCompleted: (finalAnswer: string) => void
  /** error event */
  addError: (msg: string) => void
  /** Reset all streaming state */
  clearLog: () => void
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useSocketStore = create<SocketState>((set, get) => ({
  isConnected: false,
  isStreaming: false,
  currentNodeId: null,
  blocks: [],
  result: null,
  error: null,

  setConnected: (v) => set({ isConnected: v }),
  setStreaming: (v) => set({ isStreaming: v }),
  setCurrentNodeId: (id) => set({ currentNodeId: id }),

  openNodeBlock: (nodeId, turn) => {
    const existing = get().blocks.find((b) => b.nodeId === nodeId)
    if (existing) return  // already open (e.g. duplicate event)
    set((s) => ({
      blocks: [
        ...s.blocks,
        {
          nodeId,
          agentName: '',
          turn,
          text: '',
          status: 'pending' as NodeBlockStatus,
        },
      ],
    }))
  },

  setAgentTyping: (nodeId, agentName) => {
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.nodeId === nodeId
          ? { ...b, agentName, status: 'typing' as NodeBlockStatus }
          : b
      ),
    }))
  },

  appendChunk: (nodeId, chunk) => {
    // Batch state update — find block by nodeId, append text
    set((s) => {
      const idx = s.blocks.findIndex((b) => b.nodeId === nodeId)
      if (idx === -1) {
        // Block not yet opened (race condition) — create it
        return {
          blocks: [
            ...s.blocks,
            { nodeId, agentName: '', turn: 0, text: chunk, status: 'typing' as NodeBlockStatus },
          ],
        }
      }
      const updated = [...s.blocks]
      updated[idx] = { ...updated[idx], text: updated[idx].text + chunk, status: 'typing' as NodeBlockStatus }
      return { blocks: updated }
    })
  },

  closeAgentBlock: (nodeId, agentName) => {
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.nodeId === nodeId
          ? { ...b, agentName: agentName || b.agentName, status: 'done' as NodeBlockStatus, completedAt: Date.now() }
          : b
      ),
    }))
  },

  closeNodeBlock: (nodeId, _turn) => {
    // Already handled by closeAgentBlock, just ensure status is done
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.nodeId === nodeId && b.status !== 'done'
          ? { ...b, status: 'done' as NodeBlockStatus, completedAt: Date.now() }
          : b
      ),
    }))
  },

  setWorkflowCompleted: (finalAnswer) => {
    set({ result: { finalAnswer, completedAt: Date.now() }, isStreaming: false })
  },

  addError: (msg) => set({ error: msg, isStreaming: false }),

  clearLog: () => set({ blocks: [], result: null, error: null, currentNodeId: null, isStreaming: false }),
}))
