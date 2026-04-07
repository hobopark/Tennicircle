'use client'

import { useState, useTransition } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { toast } from 'sonner'
import { cancelSession } from '@/lib/actions/sessions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface CancelSessionDialogProps {
  sessionId: string
  isOpen: boolean
  onClose: () => void
}

export function CancelSessionDialog({ sessionId, isOpen, onClose }: CancelSessionDialogProps) {
  const [reason, setReason] = useState('')
  const [showError, setShowError] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleClose() {
    setReason('')
    setShowError(false)
    setServerError(null)
    onClose()
  }

  function handleSubmit() {
    if (!reason.trim()) {
      setShowError(true)
      return
    }

    setShowError(false)
    setServerError(null)

    startTransition(async () => {
      const formData = new FormData()
      formData.set('cancellation_reason', reason.trim())
      const result = await cancelSession(sessionId, formData)
      if (result.success) {
        toast.success('Session cancelled')
        handleClose()
      } else {
        const errorMsg = result.fieldErrors?.cancellation_reason?.[0] ?? result.error ?? 'Something went wrong. Please try again.'
        setServerError(errorMsg)
      }
    })
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }} modal>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Popup className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-popover rounded-2xl shadow-lg w-full max-w-[400px] p-6 flex flex-col gap-4">
            <Dialog.Title className="text-[20px] font-bold text-foreground leading-tight">
              Cancel this session?
            </Dialog.Title>

            <div className="flex flex-col gap-2">
              <Label htmlFor="cancel-reason" className="text-sm font-medium text-foreground">
                Reason (required)
              </Label>
              <Input
                id="cancel-reason"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value)
                  if (showError && e.target.value.trim()) setShowError(false)
                }}
                placeholder="e.g. Rain, Public holiday"
                disabled={isPending}
                aria-invalid={showError || undefined}
              />
              {showError && (
                <p className="text-[14px] text-destructive">Please enter a reason for attendees</p>
              )}
              {serverError && (
                <p className="text-[14px] text-destructive">{serverError}</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={handleClose}
                disabled={isPending}
                type="button"
              >
                Keep session
              </Button>
              <Button
                variant="destructive"
                onClick={handleSubmit}
                disabled={isPending}
                type="button"
              >
                {isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling...</>
                ) : (
                  'Cancel session'
                )}
              </Button>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
