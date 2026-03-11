import { useEffect, useState } from 'react'
import { Bot, Loader2, Check, Settings2, FileText, Sparkles } from 'lucide-react'
import { useCreateAgent, useUpdateAgent } from '@/hooks/queries/useAgentQueries'
import type { Agent, CreateAgentPayload } from '@/types'
import { cn } from '@/lib/utils'

// Shadcn UI Components
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const GOOGLE_MODELS = ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash']
const OPENAI_MODELS = ['o3-mini', 'gpt-4o', 'gpt-4o-mini']

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
  const mode = agent ? 'edit' : 'create'
  const [form, setForm] = useState<CreateAgentPayload>(defaultForm())
  const [activeTab, setActiveTab] = useState('basic')

  const createAgent = useCreateAgent()
  const updateAgent = useUpdateAgent()
  const isBusy = createAgent.isPending || updateAgent.isPending

  useEffect(() => {
    if (open) {
      setForm(agent ? { ...agent } : defaultForm())
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
        await createAgent.mutateAsync(form)
        toast.success('Agent created successfully')
      } else {
        await updateAgent.mutateAsync({ id: agent!.id, payload: form })
        toast.success('Agent updated successfully')
      }
      onClose()
    } catch (error) {
      toast.error('Operation failed. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-none shadow-2xl sm:rounded-2xl bg-white">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">

          {/* Header Section */}
          <DialogHeader className="px-6 py-6 border-b bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 text-white shadow-lg rounded-2xl bg-violet-600 shadow-violet-200">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900">
                  {mode === 'create' ? 'Assemble New Agent' : 'Refine Agent Identity'}
                </DialogTitle>
                <DialogDescription className="font-medium text-slate-500">
                  {mode === 'create' ? 'Deploy a new AI specialist to your workspace.' : `Modifying ${agent?.name}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 border-b bg-white">
              <TabsList className="justify-start w-full h-auto p-0 bg-transparent space-x-8">
                <TabsTrigger value="basic" className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 font-semibold text-slate-500 data-[state=active]:text-violet-700">
                  <FileText className="w-4 h-4 mr-2" /> Basic Info
                </TabsTrigger>
                <TabsTrigger value="config" className="relative h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-violet-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 font-semibold text-slate-500 data-[state=active]:text-violet-700">
                  <Settings2 className="w-4 h-4 mr-2" /> Logic & Tools
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 p-6 bg-slate-50/20">

              {/* Tab: Basic Info */}
              <TabsContent value="basic" className="m-0 space-y-6 outline-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="agent-name" className="text-slate-700">Agent Name <span className="text-red-500">*</span></Label>
                    <Input
                      id="agent-name"
                      placeholder="e.g. Research Assistant"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="agent-desc" className="text-slate-700">Role Summary <span className="text-red-500">*</span></Label>
                    <Input
                      id="agent-desc"
                      placeholder="e.g. Expert in medical journals"
                      value={form.description || ''}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt" className="text-slate-700">System Prompt <span className="text-red-500">*</span></Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe the agent's behavior, tone, and constraints..."
                    className="min-h-[250px] font-mono text-sm leading-relaxed"
                    value={form.system_prompt || ''}
                    onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
                    required
                  />
                </div>
              </TabsContent>

              {/* Tab: Logic & Tools */}
              <TabsContent value="config" className="m-0 space-y-8 outline-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-5 bg-white border border-slate-100 shadow-sm rounded-xl">
                  {/* Shadcn Select for Model Selection */}
                  <div className="space-y-3">
                    <Label className="text-slate-700">Intelligence Model</Label>
                    <Select
                      value={form.model}
                      onValueChange={(val) => setForm({ ...form, model: val })}
                    >
                      <SelectTrigger className="w-full bg-slate-50/50">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel className="text-violet-600">Google Gemini</SelectLabel>
                          {GOOGLE_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel className="text-blue-600">OpenAI</SelectLabel>
                          {OPENAI_MODELS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Shadcn Slider for Temperature */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-700">Creativity (Temp)</Label>
                      <span className="px-2 py-0.5 text-xs font-bold text-violet-700 bg-violet-100 rounded-full">
                        {form.temperature?.toFixed(1)}
                      </span>
                    </div>
                    <Slider
                      max={2}
                      step={0.1}
                      value={[form.temperature || 1.0]}
                      onValueChange={([val]) => setForm({ ...form, temperature: val })}
                      className="py-4"
                    />
                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 tracking-tighter">
                      <span>Strict</span>
                      <span>Balanced</span>
                      <span>Creative</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-slate-700 font-bold">Enabled Capabilities</Label>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {ALL_TOOLS.map((tool) => {
                      const isSelected = form.tools?.includes(tool.id)
                      return (
                        <div
                          key={tool.id}
                          onClick={() => toggleTool(tool.id)}
                          className={cn(
                            "flex items-center p-3 cursor-pointer rounded-xl border-2 transition-all duration-200 group",
                            isSelected
                              ? "border-violet-600 bg-violet-50/50 ring-2 ring-violet-50"
                              : "border-slate-100 hover:border-violet-200 hover:bg-slate-50"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 flex items-center justify-center rounded-md mr-3 transition-colors",
                            isSelected ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-400 group-hover:bg-violet-100"
                          )}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                          <span className={cn(
                            "text-sm font-semibold",
                            isSelected ? "text-violet-900" : "text-slate-600"
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

          {/* Action Footer */}
          <DialogFooter className="px-6 py-4 border-t bg-white">
            <Button variant="ghost" onClick={onClose} disabled={isBusy} className="font-semibold text-slate-500">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isBusy || !form.name.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white min-w-[140px] shadow-lg shadow-violet-100 font-bold"
            >
              {isBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : mode === 'create' ? 'Deploy Agent' : 'Commit Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}