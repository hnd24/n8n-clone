import React, { useCallback, useRef, useEffect } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { useWorkflowStore } from '@/store/workflowStore'
import { nodeTypes } from '@/components/nodes/nodeTypes'
import type { Agent } from '@/types'
import { Save, Trash2, Play, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import WorkflowSaveDialog from './WorkflowSaveDialog'

interface WorkflowCanvasProps {
  onRunWorkflow?: () => void
  activeNodeIds?: string[]
  completedNodeIds?: string[]
}

// Inner canvas — must be wrapped in ReactFlowProvider
function CanvasInner({
  onRunWorkflow,
  activeNodeIds = [],
  completedNodeIds = [],
}: WorkflowCanvasProps) {
  const { 
    selectedWorkflow,
    workflowName, 
    setWorkflowName,
    isPublic,
    setIsPublic,
    nodes, edges, setNodes, setEdges, addAgentToCanvas, clearCanvas 
  } = useWorkflowStore()
  
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false)
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { fitView } = useReactFlow()

  // Debug: log nodes whenever they change
  useEffect(() => {
    console.log('[WorkflowCanvas] nodes in store:', nodes.length, nodes.map(n => n.id))
  }, [nodes])

  // fitView whenever nodes are set externally (e.g. from loading a workflow)
  useEffect(() => {
    if (nodes.length > 0) {
      // Small delay to let ReactFlow measure the nodes first
      const t = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 100)
      return () => clearTimeout(t)
    }
  }, [nodes.length, fitView])

  // Enrich nodes with isActive/isCompleted from streaming
  const enrichedNodes: Node[] = nodes.map((node) => {
    const agentId = (node.data as { agent?: Agent }).agent?.id ?? ''
    const isActive = activeNodeIds.includes(node.id) || activeNodeIds.includes(agentId)
    const isCompleted = completedNodeIds.includes(node.id) || completedNodeIds.includes(agentId)
    return { ...node, data: { ...node.data, isActive, isCompleted } }
  })

  // ✅ Use ReactFlow's built-in helpers — handles dimensions, position, selection, etc.
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(applyNodeChanges(changes, nodes)),
    [nodes, setNodes]
  )

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(applyEdgeChanges(changes, edges)),
    [edges, setEdges]
  )

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges(addEdge({
        ...params,
        id: `edge-${params.source}-${params.target}`,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#7c3aed', strokeWidth: 2 },
      }, edges))
    },
    [edges, setEdges]
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const agentJson = event.dataTransfer.getData('application/agent-json')
      if (!agentJson) return
      try {
        const agent: Agent = JSON.parse(agentJson)
        const wrapper = reactFlowWrapper.current
        if (!wrapper) return
        const bounds = wrapper.getBoundingClientRect()
        addAgentToCanvas(agent, {
          x: event.clientX - bounds.left - 120,
          y: event.clientY - bounds.top - 60,
        })
      } catch (e) {
        console.error('Failed to parse drop data', e)
      }
    },
    [addAgentToCanvas]
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleSaveClick = () => {
    // Collect agents in X-coordinate order to enforce sequence
    const sortedNodes = [...nodes].sort((a, b) => a.position.x - b.position.x)
    const orderedAgents = sortedNodes
      .map((n) => (n.data as { agent?: Agent }).agent)
      .filter((agent): agent is Agent => Boolean(agent?.id))

    if (orderedAgents.length === 0) {
      toast.error('Workflow trống', { description: 'Vui lòng thêm ít nhất 1 Agent vào Canvas trước khi lưu.' })
      return
    }

    setSaveDialogOpen(true)
  }

  // Derive ordered agents strictly for the dialog to display
  const orderedAgents = [...nodes]
    .sort((a, b) => a.position.x - b.position.x)
    .map((n) => (n.data as { agent?: Agent }).agent)
    .filter((agent): agent is Agent => Boolean(agent?.id))

  return (
    <div
      ref={reactFlowWrapper}
      style={{ width: '100%', height: '100%', position: 'relative' }}
    >
      <ReactFlow
        nodes={enrichedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        attributionPosition="bottom-left"
        minZoom={0.2}
        maxZoom={2}
        deleteKeyCode="Delete"
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#7c3aed', strokeWidth: 2 },
        }}
        style={{ width: '100%', height: '100%', background: '#f8fafc' }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#cbd5e1" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor="#7c3aed"
          maskColor="rgba(148,163,184,0.2)"
          style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
        />

        <MiniMap
          nodeColor="#7c3aed"
          maskColor="rgba(148,163,184,0.2)"
          style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}
        />

        {/* Toolbar */}
        <Panel position="top-right" className="flex gap-2">
          {onRunWorkflow && nodes.length > 0 && (
            <Button
              id="run-workflow-btn"
              onClick={onRunWorkflow}
              className="h-8 px-3 text-xs bg-violet-600 hover:bg-violet-700 text-white shadow-md"
            >
              <Play className="w-3.5 h-3.5 mr-1.5" /> Run
            </Button>
          )}
          {nodes.length > 0 && (
            <Button
              id="save-workflow-btn"
              variant="default"
              onClick={handleSaveClick}
              className="h-8 px-3 text-xs shadow-md bg-zinc-900 hover:bg-zinc-800"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save Workflow
            </Button>
          )}
          {nodes.length > 0 && (
            <Button
              variant="outline"
              onClick={clearCanvas}
              className="h-8 px-3 text-xs text-gray-500 hover:text-red-600 hover:border-red-300 shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Clear
            </Button>
          )}
        </Panel>

        {/* Empty state */}
        {nodes.length === 0 && (
          <Panel position="top-center" className="pointer-events-none">
            <div className="text-center mt-20 select-none">
              <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <GitBranch className="w-8 h-8 text-violet-300" />
              </div>
              <p className="text-gray-500 text-sm font-medium">Drag agents from the sidebar to build your workflow</p>
              <p className="text-gray-400 text-xs mt-1">Or go to the Workflows tab and click a workflow to load it</p>
            </div>
          </Panel>
        )}
      </ReactFlow>

      <WorkflowSaveDialog 
        open={saveDialogOpen} 
        onOpenChange={setSaveDialogOpen} 
        orderedAgents={orderedAgents}
      />
    </div>
  )
}

// Outer wrapper with ReactFlowProvider — required for useReactFlow() to work
export default function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  )
}
