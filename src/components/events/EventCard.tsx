'use client'

import Link from 'next/link'
import { CalendarDays, MapPin } from 'lucide-react'
import type { EventWithRsvpStatus } from '@/lib/types/events'
import { EVENT_TYPE_LABELS } from '@/lib/types/events'
import { formatEventDate } from '@/lib/utils/dates'
import { EVENT_TYPE_BADGE_CLASSES as TYPE_BADGE_CLASSES, EVENT_TYPE_COLORS } from '@/lib/constants/events'
import { EventRsvpButton } from './EventRsvpButton'

const CARD_BORDER_COLORS: Record<string, string> = {
  tournament: 'border-l-blue-500',
  social: 'border-l-[#c8e030]',
  open_session: 'border-l-orange-500',
}

interface EventCardProps {
  event: EventWithRsvpStatus
}

export function EventCard({ event }: EventCardProps) {
  const spotsLeft = event.capacity !== null ? event.capacity - event.rsvp_count : null
  const isFull = spotsLeft !== null && spotsLeft <= 0
  const userRsvp = event.user_rsvp
  const borderColor = CARD_BORDER_COLORS[event.event_type] ?? 'border-l-primary'

  return (
    <Link
      href={`/events/${event.id}`}
      className={`block bg-card rounded-2xl border border-border/50 border-l-[3px] ${borderColor} p-4 active:scale-[0.98] transition-transform cursor-pointer`}
    >
      {/* Top row: type badge + spots pill */}
      <div className="flex items-center justify-between mb-2">
        <span className={TYPE_BADGE_CLASSES[event.event_type]}>
          {EVENT_TYPE_LABELS[event.event_type]}
        </span>

        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
          event.capacity === null
            ? 'text-primary bg-primary/10'
            : isFull
            ? 'text-red-500 bg-red-500/10'
            : event.rsvp_count / event.capacity >= 0.75
            ? 'text-orange-500 bg-orange-500/10'
            : 'text-primary bg-primary/10'
        }`}>
          {event.rsvp_count}/{event.capacity ?? '∞'} spots
        </span>
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
            <span className="inline-block bg-orange-500/10 text-orange-500 text-[10px] font-bold px-2.5 py-1 rounded-full">
              Waitlisted
            </span>
          )}
        </div>
      ) : (
        <div onClick={(e) => { e.preventDefault(); e.stopPropagation() }} role="group">
          <EventRsvpButton eventId={event.id} userRsvp={userRsvp} />
        </div>
      )}
    </Link>
  )
}
