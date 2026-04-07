'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pencil, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { WaitlistPanel } from '@/components/sessions/WaitlistPanel'
import { CancelSessionDialog } from '@/components/sessions/CancelSessionDialog'
import type { Session, SessionRsvp } from '@/lib/types/sessions'

interface RsvpWithName extends SessionRsvp {
  member_name: string
}

interface CoachInfo {
  member_name: string
  is_primary: boolean
}

interface SessionDetailPanelProps {
  session: Session
  rsvps: RsvpWithName[]
  coaches: CoachInfo[]
}

function formatSessionDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatSessionTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function SessionDetailPanel({ session, rsvps, coaches }: SessionDetailPanelProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)

  const isCancelled = session.cancelled_at !== null

  const confirmedRsvps = rsvps.filter(r => r.rsvp_type === 'confirmed' && !r.cancelled_at)
  const waitlistedRsvps = rsvps.filter(r => r.rsvp_type === 'waitlisted' && !r.cancelled_at)

  const primaryCoaches = coaches.filter(c => c.is_primary).map(c => c.member_name)
  const coCoaches = coaches.filter(c => !c.is_primary).map(c => c.member_name)
  const coachDisplay = [...primaryCoaches, ...coCoaches].join(', ')

  return (
    <div className="flex flex-col gap-6">
      {/* Cancelled banner */}
      {isCancelled && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3">
          <p className="text-[14px] text-destructive font-medium">
            Cancelled: {session.cancellation_reason}
          </p>
        </div>
      )}

      {/* Session header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-[20px] font-bold text-foreground leading-tight">
            {formatSessionDate(session.scheduled_at)}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-muted-foreground">
            <span>{formatSessionTime(session.scheduled_at)}</span>
            <span>{session.venue}</span>
            {session.court_number && <span>Court {session.court_number}</span>}
            {coachDisplay && <span>{coachDisplay}</span>}
          </div>
        </div>

        {/* Actions — hidden when cancelled */}
        {!isCancelled && (
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/coach/sessions/${session.id}/edit`}
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[min(var(--radius-md),12px)] text-[0.8rem] font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Link>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setCancelDialogOpen(true)}
            >
              <XCircle className="w-4 h-4" />
              Cancel session
            </Button>
          </div>
        )}
      </div>

      {/* Confirmed attendees */}
      <div>
        <h2 className="text-[16px] font-bold text-foreground mb-3">
          Confirmed ({confirmedRsvps.length} / {session.capacity})
        </h2>
        {confirmedRsvps.length === 0 ? (
          <p className="text-base text-muted-foreground">No confirmed attendees yet</p>
        ) : (
          <ul className="divide-y divide-border">
            {confirmedRsvps.map(rsvp => (
              <li key={rsvp.id} className="py-2 text-base text-foreground">
                {rsvp.member_name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Waitlist */}
      <WaitlistPanel waitlistedRsvps={waitlistedRsvps} />

      {/* Cancel session dialog */}
      <CancelSessionDialog
        sessionId={session.id}
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
      />
    </div>
  )
}
