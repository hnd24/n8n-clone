/**
 * AgentFormModal.tsx
 * Create / Edit an Agent via a shadcn-style Dialog.
 *
 * Fields: name, description, system_prompt, model, tools (multi-select), temperature
 * All 9 backend-supported tools are listed based on AgentCreate schema.
 */
import { useEffect, useState } from 'react'
import { X, Bot, Loader2, Check } from 'lucide-react'
import { useCreateAgent, useUpdateAgent } from '@/hooks/queries/useAgentQueries'
import type { Agent, CreateAgentPayload } from '@/types'
import { cn } from '@/lib/utils'

// ── All tools supported by the backend (AgentCreate Literal) ──────────────
const ALL_TOOLS = [
  { id: 'memory',            label: 'Memory',            color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { id: 'web_search',        label: 'Web Search',        color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'file_editing',      label: 'File Editing',      color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { id: 'code_analysis',     label: 'Code Analysis',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { id: 'command_execution', label: 'Command Execution', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'browser',           label: 'Browser',           color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { id: 'image_generation',  label: 'Image Generation',  color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: 'clipboard',         label: 'Clipboard',         color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'skills',            label: 'Skills',            color: 'bg-gray-100 text-gray-600 border-gray-200' },
] as const

const MODELS = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-1.5-flash',
]

type Mode = 'create' | 'edit'

interface AgentFormModalProps {
  open: boolean
  onClose: () => void
  /** Pass an agent to open in edit mode; omit for create mode */
  agent?: Agent
}

const defaultForm = (): CreateAgentPayload => ({
  name: '',
  description: '',
  system_prompt: '',
  model: 'gemini-2.5-flash',
  tools: [],
  temperature: 1.0,
})

export default function AgentFormModal({ open, onClose, agent }: AgentFormModalProps) {
  const mode: Mode = agent ? 'edit' : 'create'
  const [form, setForm] = useState<CreateAgentPayload>(defaultForm())

  const createAgent = useCreateAgent()
  const updateAgent = useUpdateAgent()
  const isBusy = createAgent.isPending || updateAgent.isPending

  // Sync form when modal opens or agent changes
  useEffect(() => {
    if (open) {
      setForm(agent
        ? {
            name: agent.name,
            description: agent.description,
            system_prompt: agent.system_prompt,
            model: agent.model || 'gemini-2.5-flash',
            tools: agent.tools ?? [],
            temperature: agent.temperature ?? 1.0,
          }
        : defaultForm()
      )
    }
  }, [open, agent])

  if (!open) return null

  const toggleTool = (tool: string) => {
    setForm((f) => ({
      ...f,
      tools: f.tools?.includes(tool)
        ? f.tools.filter((t) => t !== tool)
        : [...(f.tools ?? []), tool],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'create') {
      await createAgent.mutateAsync(form)
    } else {
      await updateAgent.mutateAsync({ id: agent!.id, payload: form })
    }
    onClose()
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Modal card */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
          <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-gray-900">
              {mode === 'create' ? 'Create New Agent' : `Edit Agent`}
            </h2>
            {mode === 'edit' && (
              <p className="text-xs text-gray-400 truncate">{agent!.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Form body ──────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">

            {/* Name */}
            <Field label="Agent Name" required>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. NewsResearcherAgent"
                required
                className={inputCls}
              />
            </Field>

            {/* Description */}
            <Field label="Description" required>
              <input
                type="text"
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="One-line summary of what this agent does"
                required
                className={inputCls}
              />
            </Field>

            {/* System Prompt */}
            <Field label="System Prompt" required>
              <textarea
                value={form.system_prompt ?? ''}
                onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                placeholder="Bạn là một agent chuyên nghiệp..."
                required
                rows={6}
                className={cn(inputCls, 'resize-y')}
              />
            </Field>

            {/* Model + Temperature row */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Model">
                <select
                  value={form.model ?? 'gemini-2.5-flash'}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className={inputCls}
                >
                  {MODELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Field>

              <Field label={`Temperature (${form.temperature?.toFixed(1)})`}>
                <input
                  type="range"
                  min="0" max="2" step="0.1"
                  value={form.temperature ?? 1.0}
                  onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                  className="w-full h-2 mt-2 accent-violet-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>0 (precise)</span><span>2 (creative)</span>
                </div>
              </Field>
            </div>

            {/* Tools multi-select */}
            <Field label="Tools">
              <div className="flex flex-wrap gap-2 mt-1">
                {ALL_TOOLS.map((tool) => {
                  const selected = form.tools?.includes(tool.id)
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => toggleTool(tool.id)}
                      className={cn(
                        'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                        selected
                          ? cn(tool.color, 'shadow-sm')
                          : 'bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300',
                      )}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {tool.label}
                    </button>
                  )
                })}
              </div>
            </Field>
          </div>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              disabled={isBusy}
              className="px-4 py-1.5 text-sm font-medium text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isBusy || !form.name.trim() || !form.system_prompt?.trim()}
              className="flex items-center gap-2 px-5 py-1.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {mode === 'create' ? 'Create Agent' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Helper sub-components ─────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-shadow'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
