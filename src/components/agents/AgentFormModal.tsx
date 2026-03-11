/**
 * AgentFormModal.tsx
 * Redesigned for a cleaner, modern, and harmonious UI.
 * Consolidated color schemes to focus on a primary accent (Violet).
 */
import { useEffect, useState } from 'react'
import { Bot, Loader2, Check, Settings2, FileText } from 'lucide-react'
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

// ── Constants ─────────────────────────────────────────────────────────────

const ALL_TOOLS = [
  { id: 'memory', label: 'Memory' },
  { id: 'web_search', label: 'Web Search' },
  { id: 'file_editing', label: 'File Editing' },
  { id: 'code_analysis', label: 'Code Analysis' },
  { id: 'command_execution', label: 'Command Execution' },
  { id: 'browser', label: 'Browser' },
  { id: 'image_generation', label: 'Image Generation' },
  { id: 'clipboard', label: 'Clipboard' },
  { id: 'skills', label: 'Skills' },
] as const

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

// ── Component ─────────────────────────────────────────────────────────────

export default function AgentFormModal({ open, onClose, agent }: AgentFormModalProps) {
  const mode: Mode = agent ? 'edit' : 'create'
  const [form, setForm] = useState<CreateAgentPayload>(defaultForm())
  const [activeTab, setActiveTab] = useState('basic')

  const createAgent = useCreateAgent()
  const updateAgent = useUpdateAgent()
  const isBusy = createAgent.isPending || updateAgent.isPending

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

    try {
      if (mode === 'create') {
        const result = await createAgent.mutateAsync(form)
        toast.success(`Successfully created: ${result.name}`)
      } else {
        const result = await updateAgent.mutateAsync({ id: agent!.id, payload: form })
        toast.success(`Successfully updated: ${result.name}`)
      }
      onClose()
    } catch (error) {
      toast.error(mode === 'create' ? 'Failed to create agent' : 'Failed to update agent')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white shadow-2xl sm:rounded-2xl border-slate-200">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">

          {/* Header */}
          <DialogHeader className="px-6 py-5 bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-100/80 flex items-center justify-center border border-violet-200/50 shadow-sm">
                <Bot className="w-6 h-6 text-violet-600" />
              </div>
              <div className="space-y-1">
                <DialogTitle className="text-xl font-semibold tracking-tight text-slate-900">
                  {mode === 'create' ? 'Create New Agent' : 'Edit Agent'}
                </DialogTitle>
                <DialogDescription className="text-slate-500 font-medium">
                  {mode === 'create'
                    ? 'Configure the identity and capabilities of your new AI assistant.'
                    : `Update configuration for ${agent?.name}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Main Content Area */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-2 border-b border-slate-100 bg-white">
              <TabsList className="bg-transparent space-x-6 w-full justify-start h-auto p-0">
                <TabsTrigger
                  value="basic"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-violet-600 data-[state=active]:text-violet-700 rounded-none pb-3 pt-2 px-1 text-slate-500 font-medium"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Basic Identity
                </TabsTrigger>
                <TabsTrigger
                  value="config"
                  className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-violet-600 data-[state=active]:text-violet-700 rounded-none pb-3 pt-2 px-1 text-slate-500 font-medium"
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  Capabilities & Model
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-6 py-6 bg-slate-50/30">

              {/* ── Basic Info Tab ────────────────────────────────────── */}
              <TabsContent value="basic" className="m-0 space-y-6 outline-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Agent Name" required>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Data Analyst"
                      required
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Description" required>
                    <input
                      type="text"
                      value={form.description ?? ''}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Short summary of responsibilities"
                      required
                      className={inputCls}
                    />
                  </Field>
                </div>

                <Field label="System Prompt (Role, Goal, Backstory)" required>
                  <textarea
                    value={form.system_prompt ?? ''}
                    onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                    placeholder="You are an expert data analyst. Your primary goal is to..."
                    required
                    rows={10}
                    className={cn(inputCls, 'resize-y font-mono text-sm leading-relaxed')}
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    This prompt defines the core behavior and constraints of the agent.
                  </p>
                </Field>
              </TabsContent>

              {/* ── Configuration Tab ─────────────────────────────────── */}
              <TabsContent value="config" className="m-0 space-y-8 outline-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
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

                  <Field label="Creativity Level">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded">
                        Temperature: {form.temperature?.toFixed(1)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0" max="2" step="0.1"
                      value={form.temperature ?? 1.0}
                      onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                      className="w-full h-1.5 mt-2 accent-violet-600 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-medium uppercase tracking-wider">
                      <span>Precise</span>
                      <span>Balanced</span>
                      <span>Creative</span>
                    </div>
                  </Field>
                </div>

                <div className="space-y-3">
                  <Field label="Enabled Tools" />
                  <p className="text-sm text-slate-500 mb-4">
                    Select the tools this agent needs. Keep it minimal to avoid confusing the LLM.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ALL_TOOLS.map((tool) => {
                      const selected = form.tools?.includes(tool.id)
                      return (
                        <div
                          key={tool.id}
                          onClick={() => toggleTool(tool.id)}
                          className={cn(
                            'flex items-center p-3 rounded-lg border cursor-pointer transition-all duration-200 select-none group',
                            selected
                              ? 'bg-violet-50 border-violet-200 ring-1 ring-violet-200 shadow-sm'
                              : 'bg-white border-slate-200 hover:border-violet-300 hover:bg-slate-50'
                          )}
                        >
                          <div className={cn(
                            'w-5 h-5 rounded-md flex items-center justify-center mr-3 transition-colors',
                            selected ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-violet-100'
                          )}>
                            {selected && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <span className={cn(
                            'text-sm font-medium',
                            selected ? 'text-violet-900' : 'text-slate-600'
                          )}>
                            {tool.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </TabsContent>

            </ScrollArea>
          </Tabs>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 bg-white border-t border-slate-100 flex flex-row justify-end gap-3 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isBusy}
              className="text-slate-600 border-slate-200 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isBusy || !form.name.trim() || !form.system_prompt?.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white min-w-[140px] shadow-sm shadow-violet-200"
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

// ── Shared UI Helpers ─────────────────────────────────────────────────────

const inputCls = 'w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:border-violet-500 transition-all duration-200'

function Field({ label, required, children }: { label: string; required?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col w-full">
      <label className="text-sm font-semibold text-slate-700 mb-2.5 flex items-center">
        {label}
        {required && <span className="text-red-500 ml-1 text-lg leading-none">*</span>}
      </label>
      {children}
    </div>
  )
}