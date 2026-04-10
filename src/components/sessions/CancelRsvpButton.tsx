'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cancelRsvp } from '@/lib/actions/rsvps'
import { useCommunity } from '@/lib/context/community'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface CancelRsvpButtonProps {
  sessionId: string
}

export function CancelRsvpButton({ sessionId }: CancelRsvpButtonProps) {
  const { communityId, communitySlug } = useCommunity()
  const [isPending, startTransition] = useTransition()
  const [dialogOpen, setDialogOpen] = useState(false)
  const router = useRouter()

  function handleConfirm() {
    startTransition(async () => {
      await cancelRsvp(communityId, communitySlug, sessionId)
      setDialogOpen(false)
      toast.success('RSVP cancelled')
      router.refresh()
    })
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="text-orange-600 dark:text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
      >
        Can&apos;t make it
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl border border-border/50">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-2xl">
              Cancel your RSVP?
            </DialogTitle>
            <DialogDescription>
              You&apos;ll lose your spot in this session. You can re-join if there&apos;s still space.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-heading font-bold text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Keep my spot
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="w-full h-12 rounded-2xl bg-orange-500 text-white font-heading font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {isPending && <Loader2 className="animate-spin" size={16} />}
              Yes, cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
