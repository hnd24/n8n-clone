/**
 * StreamingPanel.tsx
 * Live output panel — renders NodeBlock timeline from socketStore.
 * UI structure follows API_FLOW_UI.md §7 "UI rendering gợi ý"
 */
import { useEffect, useRef, useDeferredValue, memo } from 'react'
import { useSocketStore, type NodeBlock } from '@/store/socketStore'
import { cn } from '@/lib/utils'
import { Trash2, Terminal, Wifi, WifiOff, CheckCircle2, Loader2 } from 'lucide-react'

// ── Agent block card ──────────────────────────────────────────────────────
const AgentBlockCard = memo(function AgentBlockCard({ block }: { block: NodeBlock }) {
  const isDone = block.status === 'done'
  const isTyping = block.status === 'typing'
  const isPending = block.status === 'pending'

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden transition-all duration-300',
      isDone   ? 'border-emerald-200 bg-emerald-50/50' :
      isTyping ? 'border-violet-200 bg-violet-50/30 shadow-sm shadow-violet-100' :
                 'border-gray-200 bg-gray-50/50'
    )}>
      {/* Block header */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 border-b',
        isDone   ? 'bg-emerald-50 border-emerald-100' :
        isTyping ? 'bg-violet-50 border-violet-100' :
                   'bg-gray-100 border-gray-200'
      )}>
        {isPending && <div className="w-2 h-2 rounded-full bg-gray-400" />}
        {isTyping  && (
          <span className="inline-flex gap-0.5">
            <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:300ms]" />
          </span>
        )}
        {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />}

        <span className={cn(
          'text-xs font-semibold flex-1 min-w-0 truncate',
          isDone ? 'text-emerald-700' : isTyping ? 'text-violet-700' : 'text-gray-500'
        )}>
          {block.agentName || `Node ${block.nodeId.slice(0, 8)}`}
        </span>

        <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
          turn {block.turn}
        </span>
      </div>

      {/* Chunk text — only render when we have content */}
      {block.text ? (
        <div className="p-3">
          <pre className="text-sm text-gray-800 font-sans whitespace-pre-wrap leading-relaxed break-words">
            {block.text}
          </pre>
          {/* Cursor blink while typing */}
          {isTyping && (
            <span className="inline-block w-0.5 h-4 bg-violet-500 ml-0.5 animate-pulse align-text-bottom" />
          )}
        </div>
      ) : isTyping ? (
        <div className="px-3 py-2 text-xs text-violet-400 italic flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" /> Generating…
        </div>
      ) : null}
    </div>
  )
})

// ── Main panel ────────────────────────────────────────────────────────────
interface StreamingPanelProps { className?: string }

export default function StreamingPanel({ className }: StreamingPanelProps) {
  const { blocks, result, error, isStreaming, isConnected, clearLog } = useSocketStore()
  const scrollRef = useRef<HTMLDivElement>(null)

  // useDeferredValue: defer non-urgent block updates to keep UI snappy during burst chunks
  const deferredBlocks = useDeferredValue(blocks)
  const deferredResult = useDeferredValue(result)

  const hasContent = deferredBlocks.length > 0 || deferredResult || error

  // Auto-scroll when new data arrives
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    if (nearBottom || isStreaming) {
      el.scrollTop = el.scrollHeight
    }
  }, [deferredBlocks, deferredResult, isStreaming])

  return (
    <div className={cn('flex flex-col h-full bg-white border-l border-gray-200 overflow-hidden', className)}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-violet-600 flex-shrink-0" />
          <span className="text-sm font-bold text-gray-800">Live Output</span>
          {isStreaming && (
            <span className="text-[10px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-full animate-pulse">
              LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Connection badge */}
          <div className={cn(
            'flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border',
            isConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-red-50 text-red-500 border-red-200'
          )}>
            {isConnected
              ? <><Wifi className="w-3 h-3" /> Connected</>
              : <><WifiOff className="w-3 h-3" /> Disconnected</>
            }
          </div>

          {hasContent && (
            <button
              onClick={clearLog}
              title="Clear output"
              className="p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-none">
        {!hasContent ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 select-none px-6 text-center">
            <Terminal className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium text-gray-400">Workflow output appears here</p>
            <p className="text-xs mt-1 text-gray-300">
              Select a workflow → Run → watch it stream
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* Error banner */}
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-xs font-semibold text-red-600 mb-0.5">Error</p>
                <p className="text-sm text-red-700 font-mono">{error}</p>
              </div>
            )}

            {/* Agent blocks — one per node_started event */}
            {deferredBlocks.map((block) => (
              <AgentBlockCard key={block.nodeId} block={block} />
            ))}

            {/* Global typing indicator */}
            {isStreaming && deferredBlocks.length === 0 && (
              <div className="flex items-center gap-2 py-3 text-violet-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm text-gray-500">Workflow starting…</span>
              </div>
            )}

            {/* Final answer card */}
            {deferredResult && (
              <div className="mt-2 rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-100 border-b border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-800">Workflow Completed</span>
                </div>
                {deferredResult.finalAnswer && (
                  <div className="p-4">
                    <pre className="text-sm text-gray-800 font-sans whitespace-pre-wrap leading-relaxed break-words">
                      {deferredResult.finalAnswer}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
