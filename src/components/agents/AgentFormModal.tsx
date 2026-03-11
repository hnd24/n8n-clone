/**
 * AgentFormModal.tsx
 * Refactored using shadcn/ui components: Dialog, Tabs, ScrollArea, Badge.
 * Models are explicitly synced from backend constants.py (Google & OpenAI priorities).
 */
import { useEffect, useState } from 'react'
import { Bot, Loader2, Check } from 'lucide-react'
import { useCreateAgent, useUpdateAgent } from '@/hooks/queries/useAgentQueries'
import type { Agent, CreateAgentPayload } from '@/types'
import { cn } from '@/lib/utils'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

// ── All tools supported by the backend (AgentCreate Literal) ──────────────
const ALL_TOOLS = [
  { id: 'memory',            label: 'Memory',            color: 'bg-violet-100 text-violet-700 hover:bg-violet-200' },
  { id: 'web_search',        label: 'Web Search',        color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { id: 'file_editing',      label: 'File Editing',      color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  { id: 'code_analysis',     label: 'Code Analysis',     color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
  { id: 'command_execution', label: 'Command Execution', color: 'bg-red-100 text-red-700 hover:bg-red-200' },
  { id: 'browser',           label: 'Browser',           color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200' },
  { id: 'image_generation',  label: 'Image Generation',  color: 'bg-pink-100 text-pink-700 hover:bg-pink-200' },
  { id: 'clipboard',         label: 'Clipboard',         color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
  { id: 'skills',            label: 'Skills',            color: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
] as const

// Synced from agent_admin_backend/AgentCrew/modules/llm/constants.py
const GOOGLE_MODELS = [
  'gemini-3.1-pro-preview',
  'gemini-3-pro-preview',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
]

const OPENAI_MODELS = [
  'o4-mini',
  'o3-mini',
  'o3',
  'gpt-5.1',
  'gpt-5',
  'gpt-4.1',
  'gpt-4.1-mini',
]

type Mode = 'create' | 'edit'

interface AgentFormModalProps {
  open: boolean
  onClose: () => void
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
  const [activeTab, setActiveTab] = useState('basic')

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
      setActiveTab('basic')
    }
  }, [open, agent])

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
      toast.promise(createAgent.mutateAsync(form), {
        loading: 'Creating agent...',
        success: (result) => `Successfully created: ${result.name}`,
        error: 'Error creating agent',
      })
    } else {
      toast.promise(updateAgent.mutateAsync({ id: agent!.id, payload: form }), {
        loading: 'Saving updates...',
        success: (result) => `Successfully updated: ${result.name}`,
        error: 'Error updating agent',
      })
    }
    
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 bg-gray-50/50">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]">
          
          <DialogHeader className="p-6 pb-4 bg-white border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Bot className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {mode === 'create' ? 'Create New Agent' : 'Edit Agent'}
                </DialogTitle>
                <DialogDescription>
                  {mode === 'create' 
                    ? 'Configure a new AI agent to participate in your workflows.' 
                    : `Updating configuration for ${agent?.name}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-4 bg-white border-b border-gray-100">
              <TabsList className="grid w-[240px] grid-cols-2">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="config">Configuration</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-white/50">
              {/* ── Basic Info Tab ────────────────────────────────────── */}
              <TabsContent value="basic" className="mt-0 space-y-5 outline-none">
                <Field label="Agent Name" required>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. DataAnalystAgent"
                    required
                    className={inputCls}
                  />
                </Field>

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

                <Field label="System Prompt (Role, Goal, Backstory)" required>
                  <textarea
                    value={form.system_prompt ?? ''}
                    onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                    placeholder="Bạn là một chuyên gia phân tích dữ liệu..."
                    required
                    rows={8}
                    className={cn(inputCls, 'resize-y font-mono text-sm leading-relaxed')}
                  />
                </Field>
              </TabsContent>

              {/* ── Configuration Tab (Tools & Models) ─────────────────── */}
              <TabsContent value="config" className="mt-0 space-y-6 outline-none">
                <div className="grid grid-cols-2 gap-6">
                  <Field label="LLM Provider & Model">
                    <select
                      value={form.model ?? 'gemini-2.5-flash'}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      className={inputCls}
                    >
                      <optgroup label="Google Vertex / AI Studio">
                        {GOOGLE_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </optgroup>
                      <optgroup label="OpenAI">
                        {OPENAI_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
                      </optgroup>
                    </select>
                  </Field>

                  <Field label={`Creativity (Temperature: ${form.temperature?.toFixed(1)})`}>
                    <input
                      type="range"
                      min="0" max="2" step="0.1"
                      value={form.temperature ?? 1.0}
                      onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                      className="w-full h-2 mt-3 accent-violet-600 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-gray-500 mt-2 font-medium">
                      <span>Precise</span>
                      <span>Balanced</span>
                      <span>Creative</span>
                    </div>
                  </Field>
                </div>

                <div className="space-y-3">
                  <Field label="Enabled Tools (Multi-select)" />
                  <ScrollArea className="h-[220px] w-full rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap gap-2.5">
                      {ALL_TOOLS.map((tool) => {
                        const selected = form.tools?.includes(tool.id)
                        return (
                          <Badge
                            key={tool.id}
                            variant="outline"
                            className={cn(
                              'cursor-pointer px-3 py-1.5 text-xs transition-all duration-200 border-dashed',
                              selected 
                                ? cn(tool.color, 'border-transparent border-solid shadow-sm scale-105') 
                                : 'text-gray-500 bg-transparent hover:bg-gray-50 hover:border-gray-300'
                            )}
                            onClick={() => toggleTool(tool.id)}
                          >
                            {selected && <Check className="w-3.5 h-3.5 mr-1.5 opacity-70" />}
                            {tool.label}
                          </Badge>
                        )
                      })}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-gray-400 font-medium px-1">
                    Select exactly the tools this agent needs. Too many tools can confuse the LLM.
                  </p>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="p-4 bg-white border-t border-gray-100 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isBusy || !form.name.trim() || !form.system_prompt?.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white min-w-[120px]"
            >
              {isBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'create' ? 'Create Agent' : 'Save Changes'}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Helper ────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 transition-shadow'

function Field({ label, required, children }: { label: string; required?: boolean; children?: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}
