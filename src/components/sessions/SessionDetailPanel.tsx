'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Pencil, XCircle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WaitlistPanel } from '@/components/sessions/WaitlistPanel'
import { CancelSessionDialog } from '@/components/sessions/CancelSessionDialog'
import { editSession } from '@/lib/actions/sessions'
import { useCommunity } from '@/lib/context/community'
import type { Session, SessionRsvp } from '@/lib/types/sessions'

interface RsvpWithName extends SessionRsvp {
  member_name: string
  member_avatar_url?: string | null
}

interface CoachInfo {
  member_name: string
  is_primary: boolean
}

interface SessionDetailPanelProps {
  session: Session & { session_templates?: { title: string } | null }
  rsvps: RsvpWithName[]
  coaches: CoachInfo[]
}

function formatSessionDate(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

function formatSessionTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-AU', { timeZone: 'Australia/Sydney', hour: 'numeric', minute: '2-digit', hour12: true })
}

export function SessionDetailPanel({ session, rsvps, coaches }: SessionDetailPanelProps) {
  const { communityId, communitySlug } = useCommunity()
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [courtNumber, setCourtNumber] = useState(session.court_number ?? '')
  const [editingCourt, setEditingCourt] = useState(false)
  const [courtPending, startCourtTransition] = useTransition()

  const isCancelled = session.cancelled_at !== null

  function saveCourtNumber() {
    startCourtTransition(async () => {
      const formData = new FormData()
      formData.set('court_number', courtNumber)
      await editSession(communityId, communitySlug, session.id, 'this', formData)
      setEditingCourt(false)
    })
  }

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
          {session.session_templates?.title && (
            <h1 className="text-[20px] font-bold text-foreground leading-tight">
              {session.session_templates.title}
            </h1>
          )}
          <p className="text-[16px] text-foreground leading-tight">
            {formatSessionDate(session.scheduled_at)}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-muted-foreground">
            <span>{formatSessionTime(session.scheduled_at)}</span>
            <span>{session.venue}</span>
            {coachDisplay && <span>{coachDisplay}</span>}
          </div>
          {/* Inline court number editor */}
          {!isCancelled && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[14px] text-muted-foreground">Court:</span>
              {editingCourt ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={courtNumber}
                    onChange={(e) => setCourtNumber(e.target.value)}
                    placeholder="e.g. 3"
                    className="h-7 w-20 text-sm"
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') saveCourtNumber() }}
                  />
                  <button
                    onClick={saveCourtNumber}
                    disabled={courtPending}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    <Check className="w-4 h-4 text-primary" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingCourt(true)}
                  className="text-[14px] text-foreground hover:underline cursor-pointer"
                >
                  {courtNumber || 'Not assigned'} <Pencil className="w-3 h-3 inline ml-1 text-muted-foreground" />
                </button>
              )}
            </div>
          )}
          {isCancelled && session.court_number && (
            <span className="text-[14px] text-muted-foreground mt-1">Court {session.court_number}</span>
          )}
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
              <li key={rsvp.id} className="py-2 flex items-center gap-3">
                {rsvp.member_avatar_url ? (
                  <img
                    src={rsvp.member_avatar_url}
                    alt={rsvp.member_name}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                    {rsvp.member_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-base text-foreground">{rsvp.member_name}</span>
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
