'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteEvent } from '@/lib/actions/events'
import { useCommunity } from '@/lib/context/community'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

interface DeleteEventButtonProps {
  eventId: string
}

export function DeleteEventButton({ eventId }: DeleteEventButtonProps) {
  const { communityId, communitySlug } = useCommunity()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleConfirm() {
    startTransition(async () => {
      const result = await deleteEvent(communityId, communitySlug, eventId)
      if (result.success) {
        setDialogOpen(false)
        toast.success('Event deleted')
        router.push(`/c/${communitySlug}/events`)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to delete event')
      }
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setDialogOpen(true)}
        aria-label="Delete event"
        className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center cursor-pointer hover:bg-orange-500/20"
      >
        <Trash2 size={16} className="text-orange-600 dark:text-orange-400" />
      </button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl border border-border/50">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-2xl">
              Delete this event?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete the event and all RSVPs. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDialogOpen(false)}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-heading font-bold text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Keep event
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className="w-full h-12 rounded-2xl bg-orange-500 text-white font-heading font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {isPending && <Loader2 className="animate-spin" size={16} />}
              Yes, delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
