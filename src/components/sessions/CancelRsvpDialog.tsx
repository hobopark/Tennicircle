'use client'

import { useTransition } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { toast } from 'sonner'
import { cancelRsvp } from '@/lib/actions/rsvps'
import { Button } from '@/components/ui/button'

interface CancelRsvpDialogProps {
  sessionId: string
  isOpen: boolean
  onClose: () => void
}

export function CancelRsvpDialog({ sessionId, isOpen, onClose }: CancelRsvpDialogProps) {
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await cancelRsvp(sessionId)
      if (result.success) {
        toast.success('RSVP cancelled')
      } else {
        toast.error(result.error ?? 'Something went wrong. Please try again.')
      }
      onClose()
    })
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Popup className="fixed z-50 bg-popover rounded-2xl p-6 shadow-lg w-full max-w-[400px] left-1/2 -translate-x-1/2 bottom-0 rounded-b-none sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-2xl">
          <Dialog.Title className="font-display text-[20px] font-bold text-foreground mb-2">
            Cancel your spot?
          </Dialog.Title>
          <Dialog.Description className="text-[16px] text-muted-foreground mb-4">
            Heads up — if you&apos;re a regular, let your coach know you won&apos;t be there.
          </Dialog.Description>
          <div className="flex gap-3 justify-end mt-4">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
              type="button"
            >
              Keep my spot
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isPending}
              type="button"
            >
              {isPending ? 'Cancelling...' : 'Yes, cancel'}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
