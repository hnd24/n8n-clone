/**
 * socketStore.ts
 * Zustand store for Socket.IO streaming state.
 * Data model follows API_FLOW_UI.md §7 event structures.
 *
 * UI grouping: timeline of NodeBlock items, each containing:
 *   - Agent name + turn
 *   - Accumulated chunk text
 *   - Status: 'pending' | 'typing' | 'done'
 *
 * Fuzzy ID resolution:
 *   The backend AI sometimes emits an agent's *name* instead of its UUID
 *   as the node_id field. All mutating actions call resolveNodeId() first,
 *   which falls back to matching by agentName when the incoming ID is not
 *   a valid UUID. This prevents nodes from getting permanently stuck.
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

// ── Helpers ───────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Returns true when the string looks like a standard UUID v4 */
const isUUID = (s: string) => UUID_RE.test(s)

/**
 * Fuzzy node ID resolver.
 *
 * If `incoming` is already a valid UUID, return it unchanged.
 * Otherwise, the backend AI sent an agent name instead of an ID — scan the
 * existing blocks and return the nodeId of the first block whose agentName
 * matches (case-insensitive) the incoming string.
 * Falls back to the original string so the caller can still create a block.
 */
const resolveNodeId = (incoming: string, blocks: NodeBlock[]): string => {
  if (isUUID(incoming)) return incoming

  // Fuzzy: find by agent name match
  const lower = incoming.toLowerCase().replace(/\s+/g, '')
  const found = blocks.find(
    (b) => b.agentName.toLowerCase().replace(/\s+/g, '') === lower
  )
  if (found) {
    console.warn(
      `[socketStore] Fuzzy ID match: "${incoming}" → "${found.nodeId}" (${found.agentName})`
    )
    return found.nodeId
  }

  // Nothing matched — use incoming as-is (openNodeBlock will create a new block)
  console.warn(`[socketStore] Non-UUID node_id received and no match: "${incoming}"`)
  return incoming
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
    const { blocks } = get()
    const resolved = resolveNodeId(nodeId, blocks)
    const existing = blocks.find((b) => b.nodeId === resolved)
    if (existing) return  // already open (duplicate event)
    set((s) => ({
      blocks: [
        ...s.blocks,
        {
          nodeId: resolved,
          agentName: '',
          turn,
          text: '',
          status: 'pending' as NodeBlockStatus,
        },
      ],
    }))
  },

  setAgentTyping: (nodeId, agentName) => {
    const resolved = resolveNodeId(nodeId, get().blocks)
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.nodeId === resolved
          ? { ...b, agentName, status: 'typing' as NodeBlockStatus }
          : b
      ),
    }))
  },

  appendChunk: (nodeId, chunk) => {
    set((s) => {
      const resolved = resolveNodeId(nodeId, s.blocks)
      const idx = s.blocks.findIndex((b) => b.nodeId === resolved)
      if (idx === -1) {
        // Race condition — create block on the fly
        return {
          blocks: [
            ...s.blocks,
            { nodeId: resolved, agentName: '', turn: 0, text: chunk, status: 'typing' as NodeBlockStatus },
          ],
        }
      }
      const updated = [...s.blocks]
      updated[idx] = { ...updated[idx], text: updated[idx].text + chunk, status: 'typing' as NodeBlockStatus }
      return { blocks: updated }
    })
  },

  closeAgentBlock: (nodeId, agentName) => {
    const resolved = resolveNodeId(nodeId, get().blocks)
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.nodeId === resolved
          ? { ...b, agentName: agentName || b.agentName, status: 'done' as NodeBlockStatus, completedAt: Date.now() }
          : b
      ),
    }))
  },

  closeNodeBlock: (nodeId, _turn) => {
    const resolved = resolveNodeId(nodeId, get().blocks)
    set((s) => ({
      blocks: s.blocks.map((b) =>
        b.nodeId === resolved && b.status !== 'done'
          ? { ...b, status: 'done' as NodeBlockStatus, completedAt: Date.now() }
          : b
      ),
    }))
  },

  setWorkflowCompleted: (finalAnswer) => {
    set({ result: { finalAnswer, completedAt: Date.now() }, isStreaming: false, currentNodeId: null })
  },

  addError: (msg) => set({ error: msg, isStreaming: false }),

  clearLog: () => set({ blocks: [], result: null, error: null, currentNodeId: null, isStreaming: false }),
}))
