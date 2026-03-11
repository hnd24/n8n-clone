/**
 * useSocket.ts
 * Socket.IO client — initialized as module-level singleton (before React mounts).
 * Spec: API_FLOW_UI.md §7 "Socket.IO Realtime APIs"
 */
import { useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useSocketStore } from '@/store/socketStore'

// ── Types matching API_FLOW_UI.md §7 exactly ─────────────────────────────
interface EvNodeStarted      { node_id: string; node_type: string; turn: number }
interface EvAgentStarted     { node_id: string; agent_name: string }
interface EvAgentChunk       { node_id: string; data: [string, string] }   // [chunk_text, assistant_response]
interface EvAgentCompleted   { node_id: string; agent_name: string }
interface EvNodeCompleted    { node_id: string; turn: number; result?: unknown }
interface EvWorkflowCompleted {
  state: {
    final_answer?: string
    original_task?: string
    allowed_agents?: string[]
    [key: string]: unknown
  }
}

import { BASE_URL } from '@/api/axiosInstance'

// ── Module-level singleton — lives for the entire app session ─────────────
let _socket: Socket | null = null

export function initSocket(): Socket {
  if (_socket?.connected || _socket?.active) return _socket

  // Cleanup stale socket
  if (_socket) {
    _socket.removeAllListeners()
    _socket.disconnect()
    _socket = null
  }

  if (!BASE_URL) {
    console.error('[Socket.IO] ❌ BASE_URL is not defined — cannot connect')
    throw new Error('Socket.IO BASE_URL is required')
  }

  const token = localStorage.getItem('access_token')

  console.log(
    `[Socket.IO] 🔌 Connecting directly to: ${BASE_URL}`,
    '| token:', token ? `${token.slice(0, 20)}…` : 'NONE'
  )

  const socket = io(BASE_URL, {
    path: '/socket.io',
    transports: ['polling', 'websocket'],   // polling first for handshake (per spec)
    withCredentials: true,
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 10000,
    timeout: 20000,
    // JWT in auth object — server reads from socket.handshake.auth.token
    ...(token ? { auth: { token } } : {}),
  })

  _socket = socket
  const s = () => useSocketStore.getState()

  // ── Connection lifecycle ────────────────────────────────────────────────
  socket.on('connect', () => {
    const transport = socket.io.engine.transport?.name ?? '?'
    console.log(
      '%c[Socket.IO] ✅ CONNECTED',
      'color:#16a34a;font-weight:bold;font-size:13px',
      `\n  sid       : ${socket.id}`,
      `\n  transport : ${transport}`,
      `\n  URL       : ${BASE_URL} (Direct)`
    )
    s().setConnected(true)
  })

  socket.on('disconnect', (reason) => {
    console.warn('[Socket.IO] ❌ Disconnected —', reason)
    s().setConnected(false)
    s().setStreaming(false)
  })

  socket.on('connect_error', (err) => {
    const desc = (err as { description?: { message?: string } }).description
    console.error(
      '%c[Socket.IO] ⚠ connect_error',
      'color:#dc2626;font-weight:bold',
      `\n  message : ${err.message}`,
      `\n  desc    : ${desc?.message ?? JSON.stringify(desc) ?? 'n/a'}`,
      `\n  URL     : /socket.io (Vite proxy)`
    )
    s().setConnected(false)
  })

  // ── Workflow streaming events (§7B) ────────────────────────────────────

  // 1. node_started → { node_id, node_type, turn }
  socket.on('node_started', (data: EvNodeStarted) => {
    console.debug('[Socket.IO] node_started', data)
    s().setCurrentNodeId(data.node_id)
    s().openNodeBlock(data.node_id, data.turn)
  })

  // 2. workflow_agent_started → { node_id, agent_name }
  socket.on('workflow_agent_started', (data: EvAgentStarted) => {
    console.debug('[Socket.IO] workflow_agent_started', data)
    s().setAgentTyping(data.node_id, data.agent_name)
  })

  // 3. workflow_agent_chunk → { node_id, data: [chunk_text, assistant_response] }
  socket.on('workflow_agent_chunk', (data: EvAgentChunk) => {
    const chunkText = Array.isArray(data.data) ? (data.data[0] ?? '') : ''
    if (chunkText) {
      s().appendChunk(data.node_id, chunkText)
    }
  })

  // 4. workflow_agent_completed → { node_id, agent_name }
  socket.on('workflow_agent_completed', (data: EvAgentCompleted) => {
    console.debug('[Socket.IO] workflow_agent_completed', data)
    s().closeAgentBlock(data.node_id, data.agent_name)
  })

  // 5. node_completed → { node_id, turn, result }
  socket.on('node_completed', (data: EvNodeCompleted) => {
    console.debug('[Socket.IO] node_completed', data)
    s().closeNodeBlock(data.node_id, data.turn)
  })

  // 6. workflow_completed → { state: { final_answer, ... } }
  socket.on('workflow_completed', (data: EvWorkflowCompleted) => {
    console.log('[Socket.IO] workflow_completed', data?.state)
    const finalAnswer = data?.state?.final_answer ?? ''
    s().setWorkflowCompleted(finalAnswer)
    s().setStreaming(false)
  })

  // 7. error
  socket.on('error', (data: unknown) => {
    const msg = typeof data === 'object' && data !== null
      ? (data as { message?: string }).message ?? JSON.stringify(data)
      : String(data)
    console.error('[Socket.IO] error event:', msg)
    s().addError(msg)
    s().setStreaming(false)
  })

  return socket
}

// ── React hook — thin wrapper, no lifecycle dependencies ─────────────────
export const useSocket = () => {
  const emitWorkflowChat = useCallback((workflowId: string, message: string) => {
    console.log('[Socket.IO] emit workflow_chat', { workflow_id: workflowId, message })
    useSocketStore.getState().clearLog()
    useSocketStore.getState().setStreaming(true)

    const socket = initSocket()

    const doEmit = () => {
      socket.emit('workflow_chat', { workflow_id: workflowId, message })
    }

    if (socket.connected) {
      doEmit()
    } else {
      console.log('[Socket.IO] Not connected — waiting for connect then emit')
      socket.once('connect', doEmit)
      socket.connect()
    }
  }, [])

  const emitAgentChat = useCallback((agentId: string, message: string) => {
    console.log('[Socket.IO] emit agent_chat', { agent_id: agentId, message })
    useSocketStore.getState().clearLog()
    useSocketStore.getState().setStreaming(true)

    const socket = initSocket()
    const doEmit = () => {
      socket.emit('agent_chat', { agent_id: agentId, message })
    }

    if (socket.connected) {
      doEmit()
    } else {
      socket.once('connect', doEmit)
      socket.connect()
    }
  }, [])

  return { emitWorkflowChat, emitAgentChat }
}
