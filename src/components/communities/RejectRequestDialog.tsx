'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { rejectJoinRequest } from '@/lib/actions/communities'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface RejectRequestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberName: string
  requestId: string
  communitySlug: string
}

export function RejectRequestDialog({
  open,
  onOpenChange,
  memberName,
  requestId,
  communitySlug,
}: RejectRequestDialogProps) {
  const [isPending, startTransition] = useTransition()

  function handleReject() {
    startTransition(async () => {
      const result = await rejectJoinRequest(requestId, communitySlug)
      if (result.success) {
        onOpenChange(false)
        toast('Request rejected.')
      } else {
        toast.error(result.error ?? 'Failed to reject request.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Reject request?</DialogTitle>
          <DialogDescription>
            Remove {memberName}&apos;s request to join this community. They will be notified.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isPending}
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium h-8 px-2.5 transition-all disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? 'Rejecting…' : 'Reject Request'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
