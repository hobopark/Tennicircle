'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { rsvpEvent, cancelEventRsvp } from '@/lib/actions/events'
import { useCommunity } from '@/lib/context/community'
import type { EventRsvp } from '@/lib/types/events'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface EventRsvpButtonProps {
  eventId: string
  userRsvp: EventRsvp | null
  onRsvpChange?: () => void
}

export function EventRsvpButton({ eventId, userRsvp, onRsvpChange }: EventRsvpButtonProps) {
  const { communityId, communitySlug } = useCommunity()
  const [isPending, startTransition] = useTransition()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [isCancelling, startCancelTransition] = useTransition()

  function handleJoin() {
    startTransition(async () => {
      const result = await rsvpEvent(communityId, communitySlug, eventId)
      if (result.success) {
        if (result.rsvpType === 'waitlisted') {
          toast.success("This event is full. You've been added to the waitlist.")
        } else {
          toast.success("You're going!")
        }
        onRsvpChange?.()
      } else {
        toast.error(result.error ?? 'Failed to RSVP')
      }
    })
  }

  function handleCancelConfirm() {
    startCancelTransition(async () => {
      const result = await cancelEventRsvp(communityId, communitySlug, eventId)
      if (result.success) {
        setCancelDialogOpen(false)
        toast.success('RSVP cancelled')
        onRsvpChange?.()
      } else {
        toast.error(result.error ?? 'Failed to cancel RSVP')
      }
    })
  }

  // If user has an active RSVP, show cancel link
  if (userRsvp && userRsvp.cancelled_at === null) {
    return (
      <>
        <button
          type="button"
          onClick={() => setCancelDialogOpen(true)}
          className="text-sm text-orange-600 dark:text-orange-400 hover:underline mt-3"
        >
          Cancel RSVP
        </button>

        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogContent className="rounded-3xl border border-border/50">
            <DialogHeader>
              <DialogTitle className="font-heading font-bold text-2xl">
                Cancel your RSVP?
              </DialogTitle>
              <DialogDescription>
                You&apos;ll lose your spot. You can re-join if there&apos;s still space.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setCancelDialogOpen(false)}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-heading font-bold text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                Keep my spot
              </button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                disabled={isCancelling}
                className="w-full h-12 rounded-2xl bg-orange-500 text-white font-heading font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {isCancelling && <Loader2 className="animate-spin" size={16} />}
                Yes, cancel
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // No RSVP — show Join button
  return (
    <button
      type="button"
      onClick={handleJoin}
      disabled={isPending}
      className="w-full h-10 rounded-2xl bg-primary text-primary-foreground text-sm font-heading font-bold mt-3 flex items-center justify-center gap-2 disabled:opacity-50"
    >
      {isPending && <Loader2 className="animate-spin" size={16} />}
      Join Event
    </button>
  )
}
