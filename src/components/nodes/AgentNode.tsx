import React, { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { Agent } from '@/types'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface AgentNodeData {
  agent: Agent
  isActive?: boolean
  isCompleted?: boolean
}

const toolColors: Record<string, string> = {
  web_search: 'bg-blue-100 text-blue-700 border-blue-200',
  memory: 'bg-violet-100 text-violet-700 border-violet-200',
  file_editing: 'bg-amber-100 text-amber-700 border-amber-200',
  code_execution: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  default: 'bg-gray-100 text-gray-600 border-gray-200',
}

const AgentNode = memo(({ data, selected }: NodeProps<AgentNodeData>) => {
  const { agent, isActive, isCompleted } = data

  return (
    <div
      className={cn(
        'relative min-w-[240px] rounded-xl border-2 shadow-md transition-all duration-300 bg-white',
        // Selection ring
        selected && !isActive && !isCompleted
          ? 'border-violet-500 shadow-violet-200 shadow-lg'
          : !isActive && !isCompleted
          ? 'border-gray-200 hover:border-violet-300 hover:shadow-violet-100 hover:shadow-lg'
          : '',
        // Active: blue pulsing ring
        isActive && 'border-blue-400 shadow-blue-300 shadow-lg animate-[pulse_1.5s_ease-in-out_infinite]',
        // Completed: solid emerald ring
        isCompleted && !isActive && 'border-emerald-400 shadow-emerald-100 shadow-md',
      )}
    >
      {/* Top colour bar */}
      <div className={cn(
        'h-1.5 rounded-t-[10px] w-full transition-all duration-500',
        isActive
          ? 'bg-gradient-to-r from-blue-400 via-blue-300 to-blue-400 animate-pulse'
          : isCompleted
          ? 'bg-emerald-400'
          : 'bg-gradient-to-r from-violet-500 to-purple-400'
      )} />

      <div className="p-4">
        {/* Target handle (input) */}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3.5 !h-3.5 !bg-violet-500 !border-2 !border-white !-left-2"
        />

        {/* Status indicator — top-right corner */}
        <div className="absolute top-4 right-4 flex items-center gap-1.5">
          {isActive && (
            <>
              {/* Spinning loader */}
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              {/* Ping dot */}
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
              </span>
            </>
          )}
          {isCompleted && !isActive && (
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          )}
        </div>

        {/* Agent icon & name */}
        <div className="flex items-start gap-2.5 mb-3">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-300',
            isActive ? 'bg-blue-100' : 'bg-violet-100'
          )}>
            <svg className={cn('w-4 h-4', isActive ? 'text-blue-600' : 'text-violet-600')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{agent.name}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{agent.description || 'No description'}</p>
          </div>
        </div>

        {/* Active label */}
        {isActive && (
          <div className="mb-2 flex items-center gap-1 text-[11px] font-semibold text-blue-600">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing…
          </div>
        )}
        {isCompleted && !isActive && (
          <div className="mb-2 text-[11px] font-semibold text-emerald-600">✓ Done</div>
        )}

        {/* Model badge */}
        <div className="mb-2.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-violet-50 text-violet-600 border border-violet-200">
            {agent.model || 'gemini-2.5-flash'}
          </span>
        </div>

        {/* Tools */}
        {agent.tools && agent.tools.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {agent.tools.map((tool) => (
              <span
                key={tool}
                className={cn(
                  'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border',
                  toolColors[tool] ?? toolColors.default
                )}
              >
                {tool.replace('_', ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Temperature */}
        {agent.temperature !== undefined && (
          <div className="mt-2 text-[10px] text-gray-400">
            🌡 temp: {agent.temperature}
          </div>
        )}

        {/* Source handle (output) */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3.5 !h-3.5 !bg-violet-500 !border-2 !border-white !-right-2"
        />
      </div>
    </div>
  )
})

AgentNode.displayName = 'AgentNode'

export default AgentNode
