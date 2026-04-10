'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateEvent } from '@/lib/actions/events'
import { useCommunity } from '@/lib/context/community'
import type { Event, EventActionResult } from '@/lib/types/events'

interface EditEventFormProps {
  event: Event
  eventId: string
}

const initialState: EventActionResult = { success: false }

export function EditEventForm({ event, eventId }: EditEventFormProps) {
  const { communityId, communitySlug } = useCommunity()
  const router = useRouter()
  const boundUpdate = updateEvent.bind(null, communityId, communitySlug, eventId)
  const [state, formAction, isPending] = useActionState(boundUpdate, initialState)

  useEffect(() => {
    if (state.success) {
      toast.success('Event updated')
      router.push(`/c/${communitySlug}/events/${eventId}`)
      router.refresh()
    }
  }, [state.success, router, eventId])

  // Parse existing date/time for default values — always in Sydney timezone
  // (server action toSydneyIso interprets submitted values as Sydney time)
  const startsAt = new Date(event.starts_at)
  const sydneyDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(startsAt)
  const dateStr = sydneyDate // en-CA gives YYYY-MM-DD format
  const sydneyHour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: false }).format(startsAt)
  const timeStr = sydneyHour

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="event_type" value={event.event_type} />

      {state.error && (
        <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl p-3">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="edit-title" className="text-sm font-medium text-foreground">Title</label>
        <input
          id="edit-title"
          name="title"
          defaultValue={event.title}
          required
          className="w-full h-12 rounded-2xl mt-1 border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {state.fieldErrors?.title && (
          <p className="text-destructive text-sm mt-1">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="edit-date" className="text-sm font-medium text-foreground">Date</label>
        <input
          id="edit-date"
          name="starts_at_date"
          type="date"
          defaultValue={dateStr}
          required
          className="w-full h-12 rounded-2xl mt-1 border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label htmlFor="edit-time" className="text-sm font-medium text-foreground">Start time</label>
        <input
          id="edit-time"
          name="starts_at_time"
          type="time"
          defaultValue={timeStr}
          required
          className="w-full h-12 rounded-2xl mt-1 border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label htmlFor="edit-venue" className="text-sm font-medium text-foreground">Venue</label>
        <input
          id="edit-venue"
          name="venue"
          defaultValue={event.venue}
          required
          className="w-full h-12 rounded-2xl mt-1 border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div>
        <label htmlFor="edit-description" className="text-sm font-medium text-foreground">Description (optional)</label>
        <textarea
          id="edit-description"
          name="description"
          defaultValue={event.description ?? ''}
          className="w-full min-h-20 rounded-2xl mt-1 border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
        />
      </div>

      <div>
        <label htmlFor="edit-capacity" className="text-sm font-medium text-foreground">Max attendees (optional)</label>
        <input
          id="edit-capacity"
          name="capacity"
          type="number"
          min="1"
          defaultValue={event.capacity ?? ''}
          className="w-full h-12 rounded-2xl mt-1 border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-12 rounded-2xl font-heading font-bold bg-primary text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isPending && <Loader2 className="animate-spin" size={16} />}
        Save Changes
      </button>
    </form>
  )
}
