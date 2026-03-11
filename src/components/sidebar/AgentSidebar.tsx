/**
 * AgentSidebar.tsx
 *
 * Improved version:
 * • Uses TanStack Query (useAgents) instead of agentsStore for real-time data
 * • "New Agent" button opens AgentFormModal in create mode
 * • Per-agent "Edit" and "Delete" buttons (delete has confirmation state)
 * • Drag-to-canvas + click "+" to add still work
 */
import React, { useState } from 'react'
import { Plus, Search, GripVertical, Bot, RefreshCw, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useWorkflowStore } from '@/store/workflowStore'
import { useAgents, useDeleteAgent } from '@/hooks/queries/useAgentQueries'
import AgentFormModal from '@/components/agents/AgentFormModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Agent } from '@/types'
import { cn } from '@/lib/utils'

export default function AgentSidebar() {
  const { addAgentToCanvas } = useWorkflowStore()
  const { data: agents = [], isLoading, refetch } = useAgents()
  const deleteAgent = useDeleteAgent()

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | undefined>(undefined)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const filtered = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDragStart = (e: React.DragEvent, agent: Agent) => {
    e.dataTransfer.setData('application/agent-id', agent.id)
    e.dataTransfer.setData('application/agent-json', JSON.stringify(agent))
    e.dataTransfer.effectAllowed = 'move'
  }

  const openCreate = () => {
    setEditingAgent(undefined)
    setModalOpen(true)
  }

  const openEdit = (agent: Agent) => {
    setEditingAgent(agent)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const toastId = toast.loading('Đang xoá agent...')
    try {
      await deleteAgent.mutateAsync(id)
      toast.dismiss(toastId)
      setConfirmDeleteId(null)
    } catch (error) {
      toast.dismiss(toastId)
      // Error toast managed by the hook
    }
  }

  return (
    <>
      <div className="flex flex-col h-full bg-white border-r border-gray-200">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-violet-600" />
              <span className="text-sm font-semibold text-gray-800">Agents</span>
              <span className="text-[10px] font-medium bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">
                {agents.length}
              </span>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => refetch()}
                title="Refresh"
                className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-violet-600 transition-colors"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
              </button>
              <button
                onClick={openCreate}
                title="Create new agent"
                className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-violet-50 text-gray-500 hover:text-violet-600 transition-colors text-[11px] font-medium border border-transparent hover:border-violet-200"
              >
                <Plus className="w-3.5 h-3.5" />
                New
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-gray-200 bg-gray-50 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-400 focus:border-violet-400"
            />
          </div>
        </div>

        {/* Hint */}
        <div className="px-4 py-2 bg-violet-50 border-b border-violet-100">
          <p className="text-[10px] text-violet-500">
            🖱 Drag to canvas · click <span className="font-bold">+</span> to add · <span className="font-bold">✏ Edit</span> / <span className="font-bold text-red-400">🗑 Delete</span>
          </p>
        </div>

        {/* ── Agent list ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {isLoading && agents.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading agents...
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>{search ? 'No results' : 'No agents yet'}</p>
              {search
                ? <button className="text-violet-500 text-xs mt-1 hover:underline" onClick={() => setSearch('')}>Clear search</button>
                : <button onClick={openCreate} className="mt-2 px-3 py-1 text-xs rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors">Create first agent</button>
              }
            </div>
          )}

          {filtered.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isDeleting={deleteAgent.isPending && confirmDeleteId === agent.id}
              confirmDelete={confirmDeleteId === agent.id}
              onDragStart={handleDragStart}
              onAddToCanvas={() => addAgentToCanvas(agent)}
              onEdit={() => openEdit(agent)}
              onDeleteRequest={() => setConfirmDeleteId(agent.id)}
              onDeleteConfirm={() => handleDelete(agent.id)}
              onDeleteCancel={() => setConfirmDeleteId(null)}
            />
          ))}
        </div>
      </div>

      {/* Modal — rendered outside sidebar layout */}
      <AgentFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        agent={editingAgent}
      />
    </>
  )
}

// ── AgentCard ──────────────────────────────────────────────────────────────

interface AgentCardProps {
  agent: Agent
  isDeleting: boolean
  confirmDelete: boolean
  onDragStart: (e: React.DragEvent, agent: Agent) => void
  onAddToCanvas: () => void
  onEdit: () => void
  onDeleteRequest: () => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
}

function AgentCard({
  agent, isDeleting, confirmDelete,
  onDragStart, onAddToCanvas, onEdit,
  onDeleteRequest, onDeleteConfirm, onDeleteCancel,
}: AgentCardProps) {
  return (
    <div
      draggable={!confirmDelete}
      onDragStart={(e) => onDragStart(e, agent)}
      className="group relative flex flex-col gap-1.5 p-3 rounded-xl border border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50 hover:shadow cursor-grab active:cursor-grabbing transition-all duration-150 shadow-sm"
    >
      {/* Top row: grip + name + action buttons */}
      <div className="flex items-start gap-2">
        <GripVertical className="w-3.5 h-3.5 text-gray-300 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{agent.name}</p>
          <p className="text-[11px] text-gray-400 truncate mt-0.5">
            {agent.description || 'No description'}
          </p>
        </div>

        {/* Action buttons — always visible on hover */}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onAddToCanvas}
            title="Add to canvas"
            className="w-6 h-6 rounded-md flex items-center justify-center bg-violet-100 hover:bg-violet-200 text-violet-600 transition-colors"
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={onEdit}
            title="Edit agent"
            className="w-6 h-6 rounded-md flex items-center justify-center bg-gray-100 hover:bg-blue-100 text-gray-500 hover:text-blue-600 transition-colors"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onClick={onDeleteRequest}
            title="Delete agent"
            className="w-6 h-6 rounded-md flex items-center justify-center bg-gray-100 hover:bg-red-100 text-gray-500 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Model + tools badges */}
      <div className="flex flex-wrap gap-1">
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-200">
          {agent.model || 'gemini-2.5-flash'}
        </span>
        {agent.tools?.slice(0, 2).map((tool) => (
          <span key={tool} className="text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
            {tool.replace('_', ' ')}
          </span>
        ))}
        {(agent.tools?.length ?? 0) > 2 && (
          <span className="text-[9px] text-gray-400">+{(agent.tools?.length ?? 0) - 2}</span>
        )}
      </div>

      {/* Confirm delete dialog (shadcn) */}
      <AlertDialog open={confirmDelete} onOpenChange={(val) => !val && onDeleteCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{agent.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault()
                onDeleteConfirm()
              }}
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
