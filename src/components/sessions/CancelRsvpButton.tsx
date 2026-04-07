'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelRsvp } from '@/lib/actions/rsvps'
import { Button } from '@/components/ui/button'

interface CancelRsvpButtonProps {
  sessionId: string
}

export function CancelRsvpButton({ sessionId }: CancelRsvpButtonProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleCancel() {
    startTransition(async () => {
      await cancelRsvp(sessionId)
      router.refresh()
    })
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCancel}
      disabled={isPending}
      className="text-destructive border-destructive/30 hover:bg-destructive/10"
    >
      {isPending ? 'Cancelling...' : "Can't make it"}
    </Button>
  )
}
