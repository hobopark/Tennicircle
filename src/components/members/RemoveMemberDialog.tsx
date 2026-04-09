'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { removeMember } from '@/lib/actions/members'
import { toast } from 'sonner'

interface RemoveMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memberId: string
  memberName: string
}

export function RemoveMemberDialog({ open, onOpenChange, memberId, memberName }: RemoveMemberDialogProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleRemove() {
    startTransition(async () => {
      const result = await removeMember(memberId)
      if (result.success) {
        toast.success(`${memberName} has been removed`)
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to remove member')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogTitle>Remove {memberName}?</DialogTitle>
        <DialogDescription>
          This will remove them from the community. They will lose access immediately.
        </DialogDescription>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button
            onClick={handleRemove}
            disabled={isPending}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isPending ? 'Removing...' : 'Remove member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
