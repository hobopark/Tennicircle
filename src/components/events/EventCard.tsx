'use client'

import Link from 'next/link'
import { CalendarDays, MapPin } from 'lucide-react'
import type { EventWithRsvpStatus, EventType } from '@/lib/types/events'
import { EVENT_TYPE_LABELS } from '@/lib/types/events'
import { EventRsvpButton } from './EventRsvpButton'

function formatEventDate(startsAt: string): string {
  const date = new Date(startsAt)
  return date.toLocaleDateString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }) + ' · ' + date.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

const TYPE_BADGE_CLASSES: Record<EventType, string> = {
  tournament: 'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-secondary/20 text-secondary-foreground',
  social: 'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary/10 text-primary',
  open_session: 'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-accent text-accent-foreground',
}

interface EventCardProps {
  event: EventWithRsvpStatus
}

export function EventCard({ event }: EventCardProps) {
  const spotsLeft = event.capacity !== null ? event.capacity - event.rsvp_count : null
  const isFull = spotsLeft !== null && spotsLeft <= 0
  const userRsvp = event.user_rsvp

  return (
    <Link
      href={`/events/${event.id}`}
      className="block bg-card rounded-3xl border border-border/50 p-4 active:scale-[0.98] transition-transform cursor-pointer"
    >
      {/* Top row: type badge + spots pill */}
      <div className="flex items-center justify-between mb-2">
        <span className={TYPE_BADGE_CLASSES[event.event_type]}>
          {EVENT_TYPE_LABELS[event.event_type]}
        </span>

        {event.capacity !== null && (
          isFull ? (
            <span className="text-[10px] font-bold bg-muted text-muted-foreground px-3 py-1 rounded-full">
              Full
            </span>
          ) : (
            <span className="text-[10px] font-bold bg-card/90 backdrop-blur-sm px-3 py-1 rounded-full text-primary">
              {spotsLeft} spots left
            </span>
          )
        )}
      </div>

      {/* Title */}
      <h3 className="font-heading font-bold text-base mb-1">{event.title}</h3>

      {/* Date */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
        <CalendarDays className="w-3 h-3 flex-shrink-0" />
        <span>{formatEventDate(event.starts_at)}</span>
      </div>

      {/* Venue */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
        <MapPin className="w-3 h-3 flex-shrink-0" />
        <span>{event.venue}</span>
      </div>

      {/* Organiser */}
      {event.creator?.display_name && (
        <p className="text-[10px] text-muted-foreground mb-2">
          by {event.creator.display_name}
        </p>
      )}

      {/* RSVP area */}
      {userRsvp && userRsvp.cancelled_at === null ? (
        <div className="mt-3">
          {userRsvp.rsvp_type === 'confirmed' ? (
            <span className="inline-block bg-primary/10 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full">
              Going
            </span>
          ) : (
            <span className="inline-block bg-muted text-muted-foreground text-[10px] font-bold px-2.5 py-1 rounded-full">
              Waitlisted
            </span>
          )}
        </div>
      ) : (
        <EventRsvpButton eventId={event.id} userRsvp={userRsvp} />
      )}
    </Link>
  )
}
