import React, { useEffect, useState } from 'react'
import { useAgentsStore } from '@/store/agentsStore'
import { useWorkflowStore } from '@/store/workflowStore'
import type { Agent } from '@/types'
import { Plus, Search, GripVertical, Bot, RefreshCw } from 'lucide-react'

interface AgentSidebarProps {
  onCreateAgent?: () => void
}

export default function AgentSidebar({ onCreateAgent }: AgentSidebarProps) {
  const { agents, isLoading, fetchAgents } = useAgentsStore()
  const { addAgentToCanvas } = useWorkflowStore()
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchAgents()
  }, [fetchAgents])

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

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
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
              onClick={() => fetchAgents()}
              title="Refresh"
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-violet-600 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {onCreateAgent && (
              <button
                onClick={onCreateAgent}
                title="Create agent"
                className="p-1 rounded hover:bg-violet-50 text-gray-500 hover:text-violet-600 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
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

      {/* Drag hint */}
      <div className="px-4 py-2 bg-violet-50 border-b border-violet-100">
        <p className="text-[10px] text-violet-500">
          🖱 Drag to canvas or click <span className="font-bold">+</span> to add
        </p>
      </div>

      {/* Agent list */}
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
            {search && (
              <button className="text-violet-500 text-xs mt-1 hover:underline" onClick={() => setSearch('')}>
                Clear search
              </button>
            )}
          </div>
        )}

        {filtered.map((agent) => (
          <div
            key={agent.id}
            draggable
            onDragStart={(e) => handleDragStart(e, agent)}
            className="group relative flex items-start gap-2 p-3 rounded-xl border border-gray-200 bg-white hover:border-violet-300 hover:bg-violet-50 cursor-grab active:cursor-grabbing transition-all duration-150 shadow-sm hover:shadow"
          >
            <GripVertical className="w-3.5 h-3.5 text-gray-300 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{agent.name}</p>
              <p className="text-[11px] text-gray-400 truncate mt-0.5 mb-1.5">
                {agent.description || 'No description'}
              </p>
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
            </div>

            <button
              onClick={() => addAgentToCanvas(agent)}
              title="Add to canvas"
              className="flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 bg-violet-100 hover:bg-violet-200 text-violet-600 transition-all"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
