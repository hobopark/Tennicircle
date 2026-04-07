'use client'

import { useTransition } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { toast } from 'sonner'
import { rsvpSession } from '@/lib/actions/rsvps'
import { Button } from '@/components/ui/button'

interface RsvpDialogProps {
  sessionId: string
  sessionLabel: string
  isWaitlist: boolean
  isOpen: boolean
  onClose: () => void
}

export function RsvpDialog({ sessionId, sessionLabel, isWaitlist, isOpen, onClose }: RsvpDialogProps) {
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await rsvpSession(sessionId)
      if (result.success) {
        if (result.rsvpType === 'confirmed') {
          toast.success("You're in!")
        } else if (result.rsvpType === 'waitlisted') {
          toast.success(`Added to waitlist — ${result.waitlistPosition} in line`)
        }
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
            Join this session?
          </Dialog.Title>
          <Dialog.Description className="text-[16px] text-foreground mb-3">
            {sessionLabel}
          </Dialog.Description>
          {isWaitlist && (
            <p className="text-[14px] text-muted-foreground mb-4">
              This session is full. You&apos;ll be added to the waitlist.
            </p>
          )}
          <div className="flex gap-3 justify-end mt-4">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirm}
              disabled={isPending}
              type="button"
            >
              {isPending ? 'Confirming...' : 'Confirm'}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
