import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Loader2, Globe, Lock, Workflow as WorkflowIcon } from 'lucide-react'
import { useCreateWorkflow, useUpdateWorkflow } from '@/hooks/queries/useWorkflowQueries'
import { toast } from 'sonner'
import { useWorkflowStore } from '@/store/workflowStore'
import type { Agent } from '@/types'

interface WorkflowSaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderedAgents: Agent[]
}

export default function WorkflowSaveDialog({ open, onOpenChange, orderedAgents }: WorkflowSaveDialogProps) {
  const { selectedWorkflow, workflowName, setWorkflowName, isPublic, setIsPublic, selectWorkflow } = useWorkflowStore()
  const createWorkflow = useCreateWorkflow()
  const updateWorkflow = useUpdateWorkflow()
  
  const [localName, setLocalName] = useState(workflowName)
  const [localIsPublic, setLocalIsPublic] = useState(isPublic)

  // Sync state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalName(workflowName)
      setLocalIsPublic(isPublic)
    }
  }, [open, workflowName, isPublic])

  const isPending = createWorkflow.isPending || updateWorkflow.isPending
  const steps = orderedAgents.map(a => a.id)

  const handleSave = async () => {
    if (!localName.trim()) {
      toast.error('Lỗi', { description: 'Tên Workflow không được để trống.' })
      return
    }

    try {
      if (selectedWorkflow) {
        toast.promise(
          updateWorkflow.mutateAsync({
            id: selectedWorkflow.id,
            payload: { steps, name: localName, is_public: localIsPublic }
          }),
          {
            loading: 'Đang cập nhật Workflow...',
            success: () => {
              setWorkflowName(localName)
              setIsPublic(localIsPublic)
              onOpenChange(false)
              return 'Đã cập nhật Workflow thành công'
            },
            error: 'Lỗi khi cập nhật Workflow'
          }
        )
      } else {
        toast.promise(
          createWorkflow.mutateAsync({
            name: localName,
            steps,
            is_public: localIsPublic,
          }),
          {
            loading: 'Đang tạo Workflow mới...',
            success: (wf) => {
              selectWorkflow(wf) // Set the newly created workflow as selected so subsequent saves will update it
              onOpenChange(false)
              return 'Đã lưu Workflow mới thành công'
            },
            error: 'Lỗi khi lưu Workflow'
          }
        )
      }
    } catch (err) {
      console.error('[WorkflowSaveDialog] Save workflow failed:', err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Lưu Workflow</DialogTitle>
          <DialogDescription>
            Đặt tên và quản lý quyền truy cập cho Workflow của bạn.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="workflow-name" className="text-right">
              Tên Workflow <span className="text-red-500">*</span>
            </Label>
            <Input
              id="workflow-name"
              placeholder="Ví dụ: AI Content Generator"
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              className="col-span-3"
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <Label className="text-base">Mức độ truy cập</Label>
              <div className="text-xs text-muted-foreground">
                {localIsPublic ? 'Mọi người trong hệ thống đều có thể xem' : 'Chỉ mình bạn có thể thấy'}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={localIsPublic}
                onCheckedChange={setLocalIsPublic}
                disabled={isPending}
              />
              {localIsPublic ? <Globe className="h-4 w-4 text-blue-500" /> : <Lock className="h-4 w-4 text-gray-400" />}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Label>Chuỗi Agent thực thi ({orderedAgents.length} bước)</Label>
            <ScrollArea className="h-[120px] rounded-md border p-4 bg-gray-50/50">
              {orderedAgents.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-4">Canvas hiện chưa có Agent nào.</div>
              ) : (
                <div className="space-y-3">
                  {orderedAgents.map((agent, index) => (
                    <div key={agent.id} className="flex items-center gap-2 relative">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 font-semibold flex items-center justify-center text-xs">
                        {index + 1}
                      </div>
                      <div className="flex-1 text-sm font-medium text-gray-700 bg-white border border-gray-200 shadow-sm rounded-md px-3 py-1.5 flex items-center justify-between">
                        <span className="truncate pr-2">{agent.name}</span>
                        <Badge variant="secondary" className="text-[10px] scale-90">{agent.model.split('-').slice(0,2).join('-')}</Badge>
                      </div>
                      {index < orderedAgents.length - 1 && (
                        <div className="absolute left-3 top-6 bottom-[-12px] w-px bg-violet-200"></div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Hủy</Button>
          <Button onClick={handleSave} disabled={isPending || orderedAgents.length === 0}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <WorkflowIcon className="mr-2 h-4 w-4" />}
            Xác nhận lưu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
