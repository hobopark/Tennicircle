'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { rsvpSession } from '@/lib/actions/rsvps'
import { useCommunity } from '@/lib/context/community'
import { Button } from '@/components/ui/button'

interface RsvpSessionButtonProps {
  sessionId: string
}

export function RsvpSessionButton({ sessionId }: RsvpSessionButtonProps) {
  const { communityId, communitySlug } = useCommunity()
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleJoin() {
    startTransition(async () => {
      const result = await rsvpSession(communityId, communitySlug, sessionId)
      if (result.success) {
        if (result.rsvpType === 'waitlisted') {
          toast.success(`Session is full. You're on the waitlist (position ${result.waitlistPosition}).`)
        } else {
          toast.success("You're in! See you there.")
        }
        router.push(`/c/${communitySlug}/sessions/${sessionId}`)
      } else {
        toast.error(result.error ?? 'Failed to RSVP')
      }
    })
  }

  return (
    <Button
      onClick={handleJoin}
      disabled={isPending}
      className="rounded-2xl font-heading font-bold"
    >
      {isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
      Join Session
    </Button>
  )
}
