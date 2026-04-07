'use client'

import { CalendarDays, Clock, MapPin, Users } from 'lucide-react'
import type { Session, SessionRsvp } from '@/lib/types/sessions'
import { RsvpButton } from './RsvpButton'

interface SessionCardProps {
  session: Session & {
    coach_name: string
    confirmed_count: number
    waitlist_count: number
    user_rsvp: SessionRsvp | null
    attendee_names: string[]
  }
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(date)
}

function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

function getInitial(name: string): string {
  return (name.charAt(0) || '?').toUpperCase()
}

export function SessionCard({ session }: SessionCardProps) {
  const isCancelled = session.cancelled_at !== null
  const spotsLeft = session.capacity - session.confirmed_count
  const isFull = spotsLeft <= 0

  const dateStr = formatDate(session.scheduled_at)
  const timeStr = formatTime(session.scheduled_at)
  const sessionLabel = `${dateStr} at ${timeStr} · ${session.venue}`

  const visibleAttendees = session.attendee_names.slice(0, 4)
  const extraCount = session.attendee_names.length - visibleAttendees.length

  return (
    <div className={`bg-card rounded-2xl border border-border p-4 sm:p-6${isCancelled ? ' opacity-60' : ''}`}>
      {/* Date + time row */}
      <div className={`flex items-center gap-3 mb-1.5${isCancelled ? ' line-through' : ''}`}>
        <span className="flex items-center gap-1 text-[14px] text-muted-foreground">
          <CalendarDays size={14} className="shrink-0" />
          {dateStr}
        </span>
        <span className="flex items-center gap-1 text-[14px] text-muted-foreground">
          <Clock size={14} className="shrink-0" />
          {timeStr}
        </span>
      </div>

      {/* Venue row */}
      <div className="flex items-center gap-1 mb-1 text-[14px] text-muted-foreground">
        <MapPin size={14} className="shrink-0" />
        <span>
          {session.venue}
          {session.court_number ? ` · Court ${session.court_number}` : ''}
        </span>
      </div>

      {/* Coach name row */}
      <div className="text-[14px] text-muted-foreground mb-2">
        {session.coach_name}
      </div>

      {/* Spots remaining */}
      {!isCancelled && (
        <div className={`flex items-center gap-1 mb-3 text-[14px] ${spotsLeft <= 3 ? 'text-accent' : 'text-muted-foreground'}`}>
          <Users size={14} className="shrink-0" />
          <span>{spotsLeft > 0 ? `${spotsLeft} spots left` : 'Session full'}</span>
        </div>
      )}

      {/* Attendee avatar preview */}
      {visibleAttendees.length > 0 && (
        <div className="flex items-center mb-4">
          {visibleAttendees.map((name, i) => (
            <div
              key={i}
              className={`w-7 h-7 rounded-full bg-primary/20 text-primary text-[11px] font-bold flex items-center justify-center${i > 0 ? ' -ml-2' : ''}`}
              title={name}
            >
              {getInitial(name)}
            </div>
          ))}
          {extraCount > 0 && (
            <span className="ml-2 text-[14px] text-muted-foreground">+{extraCount} more</span>
          )}
        </div>
      )}

      {/* Action row */}
      {isCancelled ? (
        <p className="text-[14px] text-destructive">
          Cancelled: {session.cancellation_reason ?? 'No reason given'}
        </p>
      ) : (
        <div className="flex justify-end sm:justify-end">
          <div className="w-full sm:w-auto">
            <RsvpButton
              sessionId={session.id}
              userRsvp={session.user_rsvp}
              isFull={isFull}
              waitlistCount={session.waitlist_count}
              sessionLabel={sessionLabel}
            />
          </div>
        </div>
      )}
    </div>
  )
}
