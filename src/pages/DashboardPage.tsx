import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { useWorkflowStore } from '@/store/workflowStore'
import { useSocketStore } from '@/store/socketStore'
import { useSocket, initSocket } from '@/hooks/useSocket'
import { useWorkflows, useCreateWorkflow, useUpdateWorkflow, useDeleteWorkflow } from '@/hooks/queries/useWorkflowQueries'
import { useAgents } from '@/hooks/queries/useAgentQueries'
import { updateAgentApi } from '@/api/agents'
import AgentSidebar from '@/components/sidebar/AgentSidebar'
import WorkflowCanvas from '@/components/canvas/WorkflowCanvas'
import StreamingPanel from '@/components/streaming/StreamingPanel'
import RunWorkflowModal from '@/components/streaming/RunWorkflowModal'
import type { Workflow, Agent } from '@/types'
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
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, GitBranch, Loader2, LogOut, Play, Trash2, WorkflowIcon } from 'lucide-react'

// ─── Workflows Tab ────────────────────────────────────────────────────────
function WorkflowsTab({
  onLoadWorkflow,
}: {
  onLoadWorkflow: (wf: Workflow, agents: Agent[]) => void
}) {
  const { data: workflows = [], isLoading: wfLoading } = useWorkflows()
  const { data: agents = [], isLoading: agentsLoading } = useAgents()
  const deleteWorkflowMutation = useDeleteWorkflow()

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState('all')

  const agentMap = new Map<string, string>(agents.map((a) => [a.id, a.name]))
  const isLoading = wfLoading || agentsLoading

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading workflows...
      </div>
    )
  }

  if (workflows.length === 0) {
    return (
      <div className="text-center py-12">
        <GitBranch className="w-10 h-10 mx-auto mb-3 text-gray-200" />
        <p className="text-sm text-gray-400">No workflows yet</p>
        <p className="text-xs mt-1 text-gray-300">Build one on the Canvas tab and save it</p>
      </div>
    )
  }

  const filteredWorkflows = workflows.filter(wf => {
    // 1. Search Query
    if (searchQuery && !wf.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    // 2. Tab Filter
    if (filterTab === 'public' && !wf.is_public) return false
    if (filterTab === 'private' && wf.is_public) return false
    return true
  })

  return (
    <div className="p-4 flex flex-col h-full max-w-3xl mx-auto space-y-4">
      {/* List Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <Input
          placeholder="Tìm workflow theo tên..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="xl:w-[280px]"
        />
        <Tabs value={filterTab} onValueChange={setFilterTab}>
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="public">Công khai</TabsTrigger>
            <TabsTrigger value="private">Cá nhân</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* List Body */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {filteredWorkflows.length === 0 ? (
          <div className="text-center py-12 text-gray-400">Không tìm thấy workflow nào phù hợp.</div>
        ) : (
          filteredWorkflows.map((wf) => (
            <div
              key={wf.id}
              onClick={() => onLoadWorkflow(wf, agents)}
              className="group flex flex-col gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-violet-300 hover:shadow-md cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[15px] font-semibold text-gray-800 group-hover:text-violet-700 transition-colors">
                    {wf.name}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono mt-0.5">{wf.id}</p>
                </div>
                <div className="flex gap-2 shrink-0 items-center">
                  {wf.is_public ? (
                    <Badge variant="default" className="bg-blue-100 text-blue-700 hover:bg-blue-200 uppercase tracking-wider text-[9px] px-1.5 py-0">PUBLIC</Badge>
                  ) : (
                    <Badge variant="secondary" className="uppercase tracking-wider text-[9px] px-1.5 py-0 text-gray-600">PRIVATE</Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] text-violet-600 border-violet-200 bg-violet-50">
                    {wf.steps?.length ?? 0} steps
                  </Badge>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmDeleteId(wf.id)
                    }}
                    className="ml-1 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Workflow"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* AlertDialog for this specific workflow */}
              <AlertDialog open={confirmDeleteId === wf.id} onOpenChange={(val) => !val && setConfirmDeleteId(null)}>
                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Xóa Workflow</AlertDialogTitle>
                    <AlertDialogDescription>
                      Bạn có chắc muốn xoá workflow <strong>{wf.name}</strong>? Hành động này không thể hoàn tác.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteWorkflowMutation.isPending}>Hủy</AlertDialogCancel>
                    <Button
                      variant="destructive"
                      disabled={deleteWorkflowMutation.isPending}
                      onClick={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        const toastId = toast.loading('Đang xoá workflow...')
                        try {
                          await deleteWorkflowMutation.mutateAsync(wf.id)
                          toast.dismiss(toastId)
                          setConfirmDeleteId(null)
                        } catch (error) {
                          toast.dismiss(toastId)
                          // error toast already handled by hook
                        }
                      }}
                    >
                      {deleteWorkflowMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                      Xóa
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Step pipeline visualization */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(wf.steps ?? []).map((stepId, i) => (
                  <span key={stepId} className="flex items-center gap-1.5">
                    <span className="text-xs px-2.5 py-1 rounded-md bg-gray-50 text-gray-700 border border-gray-200 font-medium">
                      {agentMap.get(stepId) ?? `Agent ${i + 1}`}
                    </span>
                    {i < (wf.steps ?? []).length - 1 && (
                      <span className="text-gray-300 font-bold">→</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, logout } = useAuthStore()
  const { nodes } = useWorkflowStore()
  const { blocks } = useSocketStore()
  const { emitWorkflowChat } = useSocket()
  const navigate = useNavigate()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [runModalOpen, setRunModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'canvas' | 'workflows'>('canvas')
  // activeNodeIds / completedNodeIds are now derived from blocks (see below)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Track active/completed nodes from streaming log + init socket
  useEffect(() => {
    initSocket() // Connection only starts when dashboard mounts
  }, [])

  /**
   * Before running, patch the coordinator (first) agent's system_prompt
   * to append a [SYSTEM INFO] block listing every downstream agent UUID.
   * This fixes the "LLM routes to wrong ID" bug: the model writes routing
   * decisions using agent names, but the backend needs real UUIDs in next_agents.
   */
  const injectCoordinatorContext = useCallback(async (workflowId: string) => {
    // Re-use the current canvas node order to determine the step sequence
    const { nodes: currentNodes } = useWorkflowStore.getState()
    const sorted = [...currentNodes].sort((a, b) => a.position.x - b.position.x)
    const agentEntries = sorted
      .map((n) => (n.data as { agent?: Agent }).agent)
      .filter((a): a is Agent => Boolean(a?.id))

    if (agentEntries.length < 2) return  // coordinator only makes sense with ≥2 agents

    const coordinator = agentEntries[0]
    const downstream = agentEntries.slice(1)

    // Build the injection block
    const injectionBlock = [
      '\n\n[SYSTEM INFO - được inject tự động bởi Frontend khi chạy workflow]',
      'Danh sách Agent ID chính xác để sử dụng trong trường "next_agents" của routing decision JSON:',
      ...downstream.map((a) => `- ${a.name}: "${a.id}"`),
      '\nLƯU Ý QUAN TRỌNG: Phải dùng đúng UUID ở trên, KHÔNG dùng tên agent.',
      '[/SYSTEM INFO]',
    ].join('\n')

    // Only inject if not already present (avoids growing prompt on repeated runs)
    if (coordinator.system_prompt?.includes('[SYSTEM INFO')) return

    try {
      await updateAgentApi(coordinator.id, {
        system_prompt: (coordinator.system_prompt ?? '') + injectionBlock,
      })
      console.log(
        `[Dashboard] Injected ${downstream.length} agent IDs into coordinator "${coordinator.name}" (${workflowId})`
      )
    } catch (err) {
      console.warn('[Dashboard] Could not inject coordinator context:', err)
      // Non-fatal: workflow still runs, just without the injection
    }
  }, [])

  // Derive active/completed node IDs from streaming blocks
  const activeNodeIds = blocks.filter((b) => b.status === 'typing').map((b) => b.nodeId)
  const completedNodeIds = blocks.filter((b) => b.status === 'done').map((b) => b.nodeId)

  const handleRunWorkflow = useCallback(
    async (message: string, workflowId?: string) => {
      const { selectedWorkflow, workflowName, isPublic } = useWorkflowStore.getState()
      const targetId = workflowId ?? selectedWorkflow?.id

      if (targetId) {
        // ── Inject coordinator context then run ────────────────────────
        await injectCoordinatorContext(targetId)
        emitWorkflowChat(targetId, message)
        return
      }

      // No saved workflow — create one on the fly from canvas nodes
      const { nodes: currentNodes } = useWorkflowStore.getState()
      const sortedNodes = [...currentNodes].sort((a, b) => a.position.x - b.position.x)
      const steps = sortedNodes
        .map((n) => (n.data as { agent?: { id: string } }).agent?.id)
        .filter((id): id is string => Boolean(id))

      if (steps.length === 0) return

      try {
        const { createWorkflowApi } = await import('@/api/workflows')
        const wf = await createWorkflowApi({ name: workflowName || `Run-${Date.now()}`, steps, is_public: isPublic })
        useWorkflowStore.getState().selectWorkflow(wf)
        await injectCoordinatorContext(wf.id)
        emitWorkflowChat(wf.id, message)
      } catch (err) {
        console.error('[Dashboard] Run-on-the-fly workflow failed:', err)
      }
    },
    [emitWorkflowChat, injectCoordinatorContext]
  )

  // Load workflow onto canvas and switch to canvas tab
  const handleLoadWorkflow = useCallback((wf: Workflow, agents: Agent[]) => {
    // Un-select to reset Run view
    useWorkflowStore.getState().selectWorkflow(null)
    // Then open it
    setTimeout(() => {
      useWorkflowStore.getState().loadWorkflowToCanvas(wf, agents)
      setActiveTab('canvas')
      if (window.innerWidth < 768) setSidebarCollapsed(true)
    }, 0)
  }, [])

  const canvasAgentNames = [...nodes]
    .sort((a, b) => a.position.x - b.position.x)
    .map((n) => (n.data as { agent?: { name: string } }).agent?.name)
    .filter(Boolean)

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-gray-200 bg-white flex-shrink-0 shadow-sm z-10">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-purple-500 flex items-center justify-center shadow-sm">
            <WorkflowIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-800 text-sm">
            n8n <span className="text-violet-600">Clone</span>
          </span>
        </div>

        {/* Pipeline breadcrumb */}
        {canvasAgentNames.length > 0 && (
          <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full border border-gray-200">
            {canvasAgentNames.map((name, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <span className="text-gray-700 font-medium">{name}</span>
                {i < canvasAgentNames.length - 1 && <span className="text-violet-400 font-bold">→</span>}
              </span>
            ))}
          </div>
        )}

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {nodes.length > 0 && (
            <button
              id="header-run-btn"
              onClick={() => setRunModalOpen(true)}
              className="flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors shadow-sm"
            >
              <Play className="w-3 h-3" />
              Run
            </button>
          )}
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-gray-400 leading-none">{user?.email}</p>
              <p className="text-xs font-semibold text-gray-700 leading-tight mt-0.5">
                {user?.name}
                {user?.is_admin && (
                  <span className="ml-1.5 text-[9px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">admin</span>
                )}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Layout ────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className={cn(
          'relative flex-shrink-0 transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'w-0' : 'w-64'
        )}>
          {!sidebarCollapsed && <AgentSidebar />}
          <button
            className="absolute top-3 -right-3 z-20 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed
              ? <ChevronRight className="w-3 h-3 text-gray-500" />
              : <ChevronLeft className="w-3 h-3 text-gray-500" />}
          </button>
        </div>

        {/* Center Content + Tabs */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Tab Bar */}
          <div className="bg-white border-b border-gray-200 px-4 flex-shrink-0">
            <div className="flex gap-0 pt-2">
              {(['canvas', 'workflows'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-5 py-1.5 text-xs font-semibold border-b-2 transition-all capitalize',
                    activeTab === tab
                      ? 'border-violet-500 text-violet-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  )}
                >
                  {tab}
                  {tab === 'canvas' && nodes.length > 0 && (
                    <span className="ml-1.5 text-[9px] bg-violet-100 text-violet-600 px-1 py-0.5 rounded-full">
                      {nodes.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'canvas' ? (
              <WorkflowCanvas
                onRunWorkflow={() => setRunModalOpen(true)}
                activeNodeIds={activeNodeIds}
                completedNodeIds={completedNodeIds}
              />
            ) : (
              <WorkflowsTab onLoadWorkflow={handleLoadWorkflow} />
            )}
          </div>
        </div>

        {/* Right Streaming Panel */}
        <div className={cn(
          'relative flex-shrink-0 transition-all duration-300 ease-in-out',
          panelCollapsed ? 'w-0' : 'w-80 xl:w-96'
        )}>
          {!panelCollapsed && <StreamingPanel className="h-full" />}
          <button
            className="absolute top-3 -left-3 z-20 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors"
            onClick={() => setPanelCollapsed(!panelCollapsed)}
          >
            {panelCollapsed
              ? <ChevronLeft className="w-3 h-3 text-gray-500" />
              : <ChevronRight className="w-3 h-3 text-gray-500" />}
          </button>
        </div>
      </div>

      <RunWorkflowModal
        open={runModalOpen}
        onClose={() => setRunModalOpen(false)}
        onRun={handleRunWorkflow}
      />
    </div>
  )
}
