import React, { useState, useEffect, useRef } from 'react'
import { useWorkflowStore } from '@/store/workflowStore'
import { Play, X, Zap, Loader2 } from 'lucide-react'

interface RunWorkflowModalProps {
  open: boolean
  onClose: () => void
  onRun: (message: string, workflowId?: string) => void
}

export default function RunWorkflowModal({ open, onClose, onRun }: RunWorkflowModalProps) {
  const { selectedWorkflow, nodes } = useWorkflowStore()
  const [message, setMessage] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [open])

  if (!open) return null

  const pipelineNames = nodes
    .sort((a, b) => a.position.x - b.position.x)
    .map((n) => (n.data as { agent?: { name: string } }).agent?.name)
    .filter(Boolean)

  const handleRun = () => {
    if (!message.trim() || isRunning) return
    setIsRunning(true)
    onRun(message.trim(), selectedWorkflow?.id)
    onClose()
    setMessage('')
    setIsRunning(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRun() }
    if (e.key === 'Escape') onClose()
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal panel */}
      <div className="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-gray-800">Run Workflow</h2>
              {selectedWorkflow && (
                <p className="text-[11px] text-violet-600 font-medium truncate max-w-[280px]">
                  {selectedWorkflow.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Pipeline visualization */}
          {pipelineNames.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                Pipeline — {pipelineNames.length} Agent{pipelineNames.length > 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2 flex-wrap p-3 bg-gray-50 rounded-xl border border-gray-200">
                {pipelineNames.map((name, i) => (
                  <React.Fragment key={i}>
                    <span className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white border border-violet-200 text-violet-700 rounded-lg shadow-sm">
                      <span className="w-4 h-4 rounded-full bg-violet-100 text-violet-600 text-[9px] font-bold flex items-center justify-center flex-shrink-0">
                        {i + 1}
                      </span>
                      {name}
                    </span>
                    {i < pipelineNames.length - 1 && (
                      <span className="text-violet-300 font-bold text-sm">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Message input */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Task / Message
            </label>
            <input
              ref={inputRef}
              id="workflow-message-input"
              type="text"
              placeholder="e.g. Research the latest AI news and write a detailed report..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-11 px-4 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent bg-gray-50 placeholder-gray-400 text-gray-800 transition-all"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">Press <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-500 font-mono">Enter</kbd> to run · <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-500 font-mono">Esc</kbd> to cancel</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 h-9 text-sm font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            id="run-workflow-confirm-btn"
            onClick={handleRun}
            disabled={!message.trim() || isRunning}
            className="flex items-center gap-2 px-5 h-9 text-sm font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
          >
            {isRunning ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
            ) : (
              <><Play className="w-4 h-4" /> Run Workflow</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
