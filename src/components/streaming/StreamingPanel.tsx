/**
 * StreamingPanel.tsx
 * Live output panel — renders NodeBlock timeline from socketStore.
 *
 * Text pipeline for each block:
 *  1. `splitTextAndJson()` slices raw text into alternating prose / JSON segments.
 *  2. Prose segments → <ReactMarkdown remarkPlugins={[remarkGfm]}>
 *  3. JSON segments that look like routing decisions → collapsible "Routing Decision" accordion
 *  4. Other JSON segments → syntax-highlighted code block
 */
import { useEffect, useRef, useDeferredValue, memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { useSocketStore, type NodeBlock } from '@/store/socketStore'
import { cn } from '@/lib/utils'
import {
  Trash2, Terminal, Wifi, WifiOff, CheckCircle2, Loader2,
  ChevronDown, ChevronRight, GitMerge,
} from 'lucide-react'

// ── Text segmentation ─────────────────────────────────────────────────────

type Segment =
  | { kind: 'text'; content: string }
  | { kind: 'routing'; content: string }   // routing decision JSON
  | { kind: 'code'; lang: string; content: string }  // other code/json block

/** Regex that matches fenced code blocks AND bare inline routing-JSON objects */
const SEGMENT_RE =
  /```(\w*)\s*([\s\S]*?)```|(\{[\s\S]*?"next_agents"[\s\S]*?\})/g

/**
 * Split raw `text` into alternating text / JSON segments.
 * Text before/between/after JSON blobs is emitted as 'text' segments.
 */
function splitTextAndJson(text: string): Segment[] {
  const segments: Segment[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  SEGMENT_RE.lastIndex = 0
  while ((match = SEGMENT_RE.exec(text)) !== null) {
    // Emit prose before this match
    if (match.index > lastIndex) {
      const prose = text.slice(lastIndex, match.index)
      if (prose.trim()) segments.push({ kind: 'text', content: prose })
    }

    if (match[3]) {
      // Bare inline JSON object containing "next_agents"
      segments.push({ kind: 'routing', content: match[3] })
    } else {
      // Fenced code block
      const lang = (match[1] ?? '').toLowerCase()
      const body = match[2] ?? ''
      const isRouting = (() => {
        try { return 'next_agents' in JSON.parse(body.trim()) }
        catch { return false }
      })()
      if (isRouting) {
        segments.push({ kind: 'routing', content: body.trim() })
      } else {
        segments.push({ kind: 'code', lang, content: body })
      }
    }

    lastIndex = match.index + match[0].length
  }

  // Trailing prose
  if (lastIndex < text.length) {
    const prose = text.slice(lastIndex)
    if (prose.trim()) segments.push({ kind: 'text', content: prose })
  }

  return segments.length ? segments : [{ kind: 'text', content: text }]
}

// ── Markdown components ───────────────────────────────────────────────────

const mdComponents: Components = {
  code({ className, children }) {
    const lang = className?.replace('language-', '') ?? ''
    const content = String(children).trim()
    const isInline = !content.includes('\n') && !lang

    if (isInline) {
      return (
        <code className="px-1 py-0.5 text-[12px] font-mono bg-slate-100 text-violet-700 rounded">
          {children}
        </code>
      )
    }
    return (
      <pre className="overflow-x-auto rounded-lg bg-slate-900 text-slate-100 text-xs p-3 my-2 font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
    )
  },
  h1: ({ children }) => <h1 className="text-base font-bold text-gray-900 mt-3 mb-1.5">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-bold text-gray-800 mt-2.5 mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-700 mt-2 mb-0.5">{children}</h3>,
  ul: ({ children }) => <ul className="pl-4 my-1.5 space-y-0.5 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="pl-4 my-1.5 space-y-0.5 list-decimal">{children}</ol>,
  li: ({ children }) => <li className="text-sm text-gray-700 leading-relaxed">{children}</li>,
  p:  ({ children }) => <p className="text-sm text-gray-800 leading-relaxed my-1">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
  em:     ({ children }) => <em className="italic text-gray-700">{children}</em>,
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="text-xs border-collapse w-full">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="px-2 py-1 bg-gray-100 border border-gray-200 font-semibold text-gray-700 text-left">{children}</th>,
  td: ({ children }) => <td className="px-2 py-1 border border-gray-200 text-gray-700">{children}</td>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-violet-300 pl-3 my-2 text-sm text-gray-600 italic">{children}</blockquote>
  ),
  hr: () => <hr className="my-3 border-gray-200" />,
}

// ── Routing Decision Accordion ────────────────────────────────────────────

function RoutingDecisionBadge({ json }: { json: string }) {
  const [open, setOpen] = useState(false)
  let parsed: Record<string, unknown> | null = null
  try { parsed = JSON.parse(json) } catch { /* ignore */ }

  const nextAgents = parsed?.next_agents
  const isDone = parsed?.done === true

  return (
    <div className="my-2 rounded-lg border border-slate-200 bg-slate-50 overflow-hidden text-xs">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-100 transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />}
        <GitMerge className="w-3 h-3 text-violet-400 flex-shrink-0" />
        <span className="font-semibold text-slate-600">Routing Decision</span>
        {isDone && (
          <span className="ml-auto px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">DONE</span>
        )}
        {Array.isArray(nextAgents) && nextAgents.length > 0 && !isDone && (
          <span className="ml-auto text-[10px] text-slate-400">
            → {(nextAgents as string[]).map((id) => String(id).slice(0, 8)).join(', ')}
          </span>
        )}
      </button>

      {/* Raw JSON — only shown when expanded */}
      {open && (
        <pre className="px-3 pb-3 text-[11px] font-mono text-slate-600 whitespace-pre-wrap break-all border-t border-slate-200 bg-white">
          {JSON.stringify(parsed ?? json, null, 2)}
        </pre>
      )}
    </div>
  )
}

// ── Prose + JSON renderer ─────────────────────────────────────────────────

function SegmentedContent({ text }: { text: string }) {
  const segments = splitTextAndJson(text)
  return (
    <>
      {segments.map((seg, i) => {
        if (seg.kind === 'routing') {
          return <RoutingDecisionBadge key={i} json={seg.content} />
        }
        if (seg.kind === 'code') {
          return (
            <pre key={i} className="overflow-x-auto rounded-lg bg-slate-900 text-slate-100 text-xs p-3 my-2 font-mono">
              <code>{seg.content}</code>
            </pre>
          )
        }
        // prose
        return (
          <ReactMarkdown key={i} remarkPlugins={[remarkGfm]} components={mdComponents}>
            {seg.content}
          </ReactMarkdown>
        )
      })}
    </>
  )
}

// ── Agent block card ──────────────────────────────────────────────────────

const AgentBlockCard = memo(function AgentBlockCard({ block }: { block: NodeBlock }) {
  const isDone    = block.status === 'done'
  const isTyping  = block.status === 'typing'
  const isPending = block.status === 'pending'

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden transition-all duration-300',
      isDone   ? 'border-emerald-200 bg-emerald-50/50' :
      isTyping ? 'border-violet-200 bg-violet-50/30 shadow-sm shadow-violet-100' :
                 'border-gray-200 bg-gray-50/50'
    )}>
      {/* Header */}
      <div className={cn(
        'flex items-center gap-2 px-3 py-2 border-b',
        isDone   ? 'bg-emerald-50 border-emerald-100' :
        isTyping ? 'bg-violet-50 border-violet-100' :
                   'bg-gray-100 border-gray-200'
      )}>
        {isPending && <div className="w-2 h-2 rounded-full bg-gray-400" />}
        {isTyping && (
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
        <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">turn {block.turn}</span>
      </div>

      {/* Body */}
      {block.text ? (
        <div className="px-4 py-3">
          <SegmentedContent text={block.text} />
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

  const deferredBlocks = useDeferredValue(blocks)
  const deferredResult = useDeferredValue(result)

  const hasContent = deferredBlocks.length > 0 || deferredResult || error

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    if (nearBottom || isStreaming) el.scrollTop = el.scrollHeight
  }, [deferredBlocks, deferredResult, isStreaming])

  return (
    <div className={cn('flex flex-col h-full bg-white border-l border-gray-200 overflow-hidden', className)}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-violet-600 flex-shrink-0" />
          <span className="text-sm font-bold text-gray-800">Live Output</span>
          {isStreaming && (
            <span className="text-[10px] font-bold bg-violet-600 text-white px-1.5 py-0.5 rounded-full animate-pulse">LIVE</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
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

      {/* Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-none">
        {!hasContent ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 select-none px-6 text-center">
            <Terminal className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium text-gray-400">Workflow output appears here</p>
            <p className="text-xs mt-1 text-gray-300">Select a workflow → Run → watch it stream</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-xs font-semibold text-red-600 mb-0.5">Error</p>
                <p className="text-sm text-red-700 font-mono">{error}</p>
              </div>
            )}

            {deferredBlocks.map((block) => (
              <AgentBlockCard key={block.nodeId} block={block} />
            ))}

            {isStreaming && deferredBlocks.length === 0 && (
              <div className="flex items-center gap-2 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                <span className="text-sm text-gray-500">Workflow starting…</span>
              </div>
            )}

            {deferredResult && (
              <div className="mt-2 rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-100 border-b border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-bold text-emerald-800">Workflow Completed</span>
                </div>
                {deferredResult.finalAnswer && (
                  <div className="px-5 py-4">
                    <SegmentedContent text={deferredResult.finalAnswer} />
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
