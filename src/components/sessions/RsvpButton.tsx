'use client'

import { useState } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SessionRsvp } from '@/lib/types/sessions'
import { RsvpDialog } from './RsvpDialog'
import { CancelRsvpDialog } from './CancelRsvpDialog'

interface RsvpButtonProps {
  sessionId: string
  userRsvp: SessionRsvp | null
  isFull: boolean
  waitlistCount: number
  sessionLabel: string
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export function RsvpButton({ sessionId, userRsvp, isFull, waitlistCount: _waitlistCount, sessionLabel }: RsvpButtonProps) {
  const [isRsvpDialogOpen, setIsRsvpDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  // Determine state
  const isConfirmed = userRsvp && !userRsvp.cancelled_at && userRsvp.rsvp_type === 'confirmed'
  const isWaitlisted = userRsvp && !userRsvp.cancelled_at && userRsvp.rsvp_type === 'waitlisted'

  if (isPending) {
    return (
      <Button
        disabled
        className="h-11 min-w-[140px] w-full sm:w-auto"
        aria-label="Loading"
      >
        <Loader2 size={16} className="animate-spin" />
      </Button>
    )
  }

  if (isConfirmed) {
    return (
      <>
        <Button
          variant="ghost"
          className="h-11 min-w-[140px] w-full sm:w-auto text-[#5B9A6B] hover:text-[#5B9A6B]/80"
          onClick={() => setIsCancelDialogOpen(true)}
          type="button"
        >
          <CheckCircle size={16} className="mr-1.5" />
          You&apos;re in
        </Button>
        <CancelRsvpDialog
          sessionId={sessionId}
          isOpen={isCancelDialogOpen}
          onClose={() => {
            setIsCancelDialogOpen(false)
            setIsPending(false)
          }}
        />
      </>
    )
  }

  if (isWaitlisted) {
    const position = userRsvp.waitlist_position ?? 1
    return (
      <>
        <Button
          variant="outline"
          className="h-11 min-w-[140px] w-full sm:w-auto border-secondary text-secondary hover:text-secondary/80"
          onClick={() => setIsCancelDialogOpen(true)}
          type="button"
        >
          {ordinal(position)} on waitlist
        </Button>
        <CancelRsvpDialog
          sessionId={sessionId}
          isOpen={isCancelDialogOpen}
          onClose={() => {
            setIsCancelDialogOpen(false)
            setIsPending(false)
          }}
        />
      </>
    )
  }

  if (isFull) {
    return (
      <>
        <Button
          variant="outline"
          className="h-11 min-w-[140px] w-full sm:w-auto border-secondary text-secondary hover:text-secondary/80"
          onClick={() => setIsRsvpDialogOpen(true)}
          type="button"
        >
          Join waitlist
        </Button>
        <RsvpDialog
          sessionId={sessionId}
          sessionLabel={sessionLabel}
          isWaitlist={true}
          isOpen={isRsvpDialogOpen}
          onClose={() => {
            setIsRsvpDialogOpen(false)
            setIsPending(false)
          }}
        />
      </>
    )
  }

  // Default: spots available
  return (
    <>
      <Button
        variant="default"
        className="h-11 min-w-[140px] w-full sm:w-auto"
        onClick={() => setIsRsvpDialogOpen(true)}
        type="button"
      >
        Join session
      </Button>
      <RsvpDialog
        sessionId={sessionId}
        sessionLabel={sessionLabel}
        isWaitlist={false}
        isOpen={isRsvpDialogOpen}
        onClose={() => {
          setIsRsvpDialogOpen(false)
          setIsPending(false)
        }}
      />
    </>
  )
}
