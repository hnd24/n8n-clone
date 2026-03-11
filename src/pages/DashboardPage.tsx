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
import { Workflow as WorkflowIcon, LogOut, Play, ChevronLeft, ChevronRight, GitBranch, Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Workflows Tab ────────────────────────────────────────────────────────
function WorkflowsTab({
  onLoadWorkflow,
}: {
  onLoadWorkflow: (wf: Workflow, agents: Agent[]) => void
}) {
  const { data: workflows = [], isLoading: wfLoading } = useWorkflows()
  const { data: agents = [], isLoading: agentsLoading } = useAgents()
  const deleteWorkflow = useDeleteWorkflow()

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

  return (
    <div className="p-4 space-y-3 overflow-auto h-full max-w-2xl">
      {workflows.map((wf) => (
        <div
          key={wf.id}
          onClick={() => onLoadWorkflow(wf, agents)}
          className="group p-4 rounded-xl border border-gray-200 bg-white hover:border-violet-300 hover:shadow-md cursor-pointer transition-all"
        >
          <div className="flex items-start justify-between mb-2.5">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 group-hover:text-violet-700 transition-colors">
                {wf.name}
              </h3>
              <p className="text-[10px] text-gray-400 font-mono mt-0.5">{wf.id}</p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0 items-center">
              {wf.is_public && (
                <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">public</span>
              )}
              <span className="text-[10px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full">
                {wf.steps?.length ?? 0} steps
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm('Bạn có chắc muốn xoá workflow này?')) {
                    deleteWorkflow.mutateAsync(wf.id)
                  }
                }}
                className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                title="Delete Workflow"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Step pipeline visualization */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(wf.steps ?? []).map((stepId, i) => (
              <span key={stepId} className="flex items-center gap-1.5">
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 font-medium">
                  {agentMap.get(stepId) ?? `Agent ${i + 1}`}
                </span>
                {i < (wf.steps ?? []).length - 1 && (
                  <span className="text-violet-300 font-bold">→</span>
                )}
              </span>
            ))}
          </div>

          <p className="text-[10px] text-gray-300 mt-2">
            Click to load onto Canvas →
          </p>
        </div>
      ))}
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, logout } = useAuthStore()
  const { nodes } = useWorkflowStore()
  const { blocks } = useSocketStore()
  const { emitWorkflowChat } = useSocket()
  const createWorkflow = useCreateWorkflow()
  const updateWorkflow = useUpdateWorkflow()
  const navigate = useNavigate()

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [runModalOpen, setRunModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'canvas' | 'workflows'>('canvas')
  // activeNodeIds / completedNodeIds are now derived from blocks (see below)
  const [savedWorkflow, setSavedWorkflow] = useState<Workflow | null>(null)

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

  const handleSaveWorkflow = async () => {
    const { nodes: currentNodes } = useWorkflowStore.getState()
    const sortedNodes = [...currentNodes].sort((a, b) => a.position.x - b.position.x)
    const steps = sortedNodes
      .map((n) => (n.data as { agent?: { id: string } }).agent?.id)
      .filter((id): id is string => Boolean(id))

    if (steps.length === 0) return

    try {
      if (savedWorkflow) {
        const wf = await updateWorkflow.mutateAsync({
          id: savedWorkflow.id,
          payload: { steps, name: savedWorkflow.name }
        })
        setSavedWorkflow(wf)
        console.log('[Dashboard] Workflow updated:', wf.id)
      } else {
        const wf = await createWorkflow.mutateAsync({
          name: `Workflow ${new Date().toLocaleTimeString()}`,
          steps,
          is_public: false,
        })
        setSavedWorkflow(wf)
        console.log('[Dashboard] Workflow saved:', wf.id)
      }
    } catch (err) {
      console.error('[Dashboard] Save workflow failed:', err)
    }
  }

  const handleRunWorkflow = useCallback(
    async (message: string, workflowId?: string) => {
      const targetId = workflowId ?? savedWorkflow?.id

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

      createWorkflow.mutateAsync({ name: `Run-${Date.now()}`, steps, is_public: false })
        .then(async (wf) => {
          setSavedWorkflow(wf)
          await injectCoordinatorContext(wf.id)
          emitWorkflowChat(wf.id, message)
        })
        .catch(console.error)
    },
    [savedWorkflow, emitWorkflowChat, createWorkflow]
  )

  // Load workflow onto canvas and switch to canvas tab
  const handleLoadWorkflow = useCallback((wf: Workflow, agents: Agent[]) => {
    setSavedWorkflow(wf)
    const store = useWorkflowStore.getState()
    store.setNodesFromSteps(wf.steps ?? [], agents)
    store.selectWorkflow(wf)       // ← persists to store so RunWorkflowModal sees it
    setActiveTab('canvas')
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
                onSaveWorkflow={() => void handleSaveWorkflow()}
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
