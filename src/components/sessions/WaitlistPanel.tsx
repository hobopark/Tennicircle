'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { promoteFromWaitlist, removeFromWaitlist } from '@/lib/actions/rsvps'
import { Button } from '@/components/ui/button'
import type { SessionRsvp } from '@/lib/types/sessions'

interface WaitlistRsvp extends SessionRsvp {
  member_name: string
}

interface WaitlistPanelProps {
  waitlistedRsvps: WaitlistRsvp[]
}

interface WaitlistRowProps {
  rsvp: WaitlistRsvp
}

function WaitlistRow({ rsvp }: WaitlistRowProps) {
  const [isPending, startTransition] = useTransition()
  const [isRemoving, startRemoveTransition] = useTransition()

  function handlePromote() {
    startTransition(async () => {
      const result = await promoteFromWaitlist(rsvp.id)
      if (result.success) {
        toast.success('Promoted to confirmed')
      } else {
        toast.error(result.error ?? 'Failed to promote')
      }
    })
  }

  function handleRemove() {
    startRemoveTransition(async () => {
      const result = await removeFromWaitlist(rsvp.id)
      if (result.success) {
        toast.success('Removed from waitlist')
      } else {
        toast.error(result.error ?? 'Failed to remove')
      }
    })
  }

  const position = rsvp.waitlist_position ?? 0

  return (
    <li className="flex items-center gap-3 py-2">
      {/* Position badge */}
      <span className="inline-flex items-center justify-center min-w-[28px] h-7 rounded-full px-2 py-0.5 bg-secondary/10 text-secondary text-[14px] font-medium shrink-0">
        {position}
      </span>

      {/* Member name */}
      <span className="flex-1 text-base text-foreground">{rsvp.member_name}</span>

      {/* Promote button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handlePromote}
        disabled={isPending || isRemoving}
        className="shrink-0"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Promote'}
      </Button>

      {/* Remove button */}
      <Button
        variant="destructive"
        size="sm"
        onClick={handleRemove}
        disabled={isPending || isRemoving}
        className="shrink-0"
      >
        {isRemoving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Remove'}
      </Button>
    </li>
  )
}

export function WaitlistPanel({ waitlistedRsvps }: WaitlistPanelProps) {
  return (
    <div>
      <h2 className="text-[16px] font-bold text-foreground mb-3">Waitlist</h2>
      {waitlistedRsvps.length === 0 ? (
        <p className="text-base text-muted-foreground">No one on the waitlist</p>
      ) : (
        <ol className="divide-y divide-border">
          {waitlistedRsvps.map((rsvp) => (
            <WaitlistRow key={rsvp.id} rsvp={rsvp} />
          ))}
        </ol>
      )}
    </div>
  )
}
