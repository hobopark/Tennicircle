'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateEvent } from '@/lib/actions/events'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { Event, EventActionResult } from '@/lib/types/events'

interface EditEventFormProps {
  event: Event
  eventId: string
}

const initialState: EventActionResult = { success: false }

export function EditEventForm({ event, eventId }: EditEventFormProps) {
  const router = useRouter()
  const boundUpdate = updateEvent.bind(null, eventId)
  const [state, formAction, isPending] = useActionState(boundUpdate, initialState)

  useEffect(() => {
    if (state.success) {
      toast.success('Event updated')
      router.push(`/events/${eventId}`)
      router.refresh()
    }
  }, [state.success, router, eventId])

  // Parse existing date/time for default values
  const startsAt = new Date(event.starts_at)
  const dateStr = startsAt.toISOString().split('T')[0]
  const timeStr = startsAt.toTimeString().slice(0, 5)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="event_type" value={event.event_type} />

      {state.error && (
        <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-xl p-3">
          {state.error}
        </p>
      )}

      <div>
        <Label htmlFor="edit-title">Title</Label>
        <Input
          id="edit-title"
          name="title"
          defaultValue={event.title}
          required
          className="h-12 rounded-2xl mt-1"
        />
        {state.fieldErrors?.title && (
          <p className="text-destructive text-sm mt-1">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      <div>
        <Label htmlFor="edit-date">Date</Label>
        <Input
          id="edit-date"
          name="starts_at_date"
          type="date"
          defaultValue={dateStr}
          required
          className="h-12 rounded-2xl mt-1"
        />
      </div>

      <div>
        <Label htmlFor="edit-time">Start time</Label>
        <Input
          id="edit-time"
          name="starts_at_time"
          type="time"
          defaultValue={timeStr}
          required
          className="h-12 rounded-2xl mt-1"
        />
      </div>

      <div>
        <Label htmlFor="edit-venue">Venue</Label>
        <Input
          id="edit-venue"
          name="venue"
          defaultValue={event.venue}
          required
          className="h-12 rounded-2xl mt-1"
        />
      </div>

      <div>
        <Label htmlFor="edit-description">Description (optional)</Label>
        <Textarea
          id="edit-description"
          name="description"
          defaultValue={event.description ?? ''}
          className="min-h-20 rounded-2xl mt-1"
        />
      </div>

      <div>
        <Label htmlFor="edit-capacity">Max attendees (optional)</Label>
        <Input
          id="edit-capacity"
          name="capacity"
          type="number"
          min="1"
          defaultValue={event.capacity ?? ''}
          className="h-12 rounded-2xl mt-1"
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
