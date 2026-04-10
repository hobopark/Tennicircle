'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createSessionTemplate } from '@/lib/actions/sessions'
import { useCommunity } from '@/lib/context/community'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { VenueAutocomplete } from './VenueAutocomplete'
import type { SessionActionResult } from '@/lib/types/sessions'

const DAYS_OF_WEEK = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
]

const DURATION_OPTIONS = [
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '90', label: '90 min' },
  { value: '120', label: '120 min' },
]

interface CoachOption {
  id: string
  display_name: string
}

interface AssignedClient {
  id: string
  email: string
}

interface CreateSessionFormProps {
  communityId: string
  assignedClients: AssignedClient[]
}

const initialState: SessionActionResult = { success: false }

export function CreateSessionForm({ communityId, assignedClients }: CreateSessionFormProps) {
  const { communitySlug, role } = useCommunity()
  const router = useRouter()
  const boundCreateSession = useMemo(
    () => createSessionTemplate.bind(null, communityId, communitySlug),
    [communityId, communitySlug]
  )
  const [state, formAction, isPending] = useActionState(boundCreateSession, initialState)

  const [title, setTitle] = useState('')
  const [dayOfWeek, setDayOfWeek] = useState('6')
  const [startTime, setStartTime] = useState('')
  const [duration, setDuration] = useState('60')
  const [venue, setVenue] = useState('')
  const [courtNumber, setCourtNumber] = useState('')
  const [capacity, setCapacity] = useState('')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')
  const [coCoachIds, setCoCoachIds] = useState<string[]>([])
  const [invitedClientIds, setInvitedClientIds] = useState<string[]>(assignedClients.map(c => c.id))
  const [availableCoaches, setAvailableCoaches] = useState<CoachOption[]>([])

  useEffect(() => {
    async function loadCoaches() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !communityId) return

      const { data: currentMember } = await supabase
        .from('community_members')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!currentMember) return

      const { data: coaches } = await supabase
        .from('community_members')
        .select('id, display_name')
        .eq('community_id', communityId)
        .eq('role', 'coach')
        .neq('id', currentMember.id)

      if (coaches) {
        setAvailableCoaches(coaches as CoachOption[])
      }
    }

    loadCoaches()
  }, [communityId])

  useEffect(() => {
    if (state.success) {
      const home = role === 'admin' ? `/c/${communitySlug}/admin` : `/c/${communitySlug}/coach`
      router.push(home)
    } else if (state.error) {
      toast.error(state.error)
    } else if (state.fieldErrors) {
      const firstError = Object.values(state.fieldErrors).flat()[0]
      if (firstError) toast.error(firstError)
    }
  }, [state, router, communitySlug])

  function toggleCoCoach(id: string) {
    setCoCoachIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    )
  }

  function toggleClient(id: string) {
    setInvitedClientIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Session title</Label>
        <Input
          id="title"
          name="title"
          type="text"
          required
          placeholder="e.g. Tuesday Evening Group"
          value={title}
          onChange={e => setTitle(e.target.value)}
          aria-invalid={!!state.fieldErrors?.title}
        />
        {state.fieldErrors?.title && (
          <p className="text-sm text-destructive">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      {/* Day of week */}
      <div className="space-y-1.5">
        <Label htmlFor="day_of_week">Day of week</Label>
        <select
          id="day_of_week"
          name="day_of_week"
          required
          value={dayOfWeek}
          onChange={e => setDayOfWeek(e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {DAYS_OF_WEEK.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
        {state.fieldErrors?.day_of_week && (
          <p className="text-sm text-destructive">{state.fieldErrors.day_of_week[0]}</p>
        )}
      </div>

      {/* Start time */}
      <div className="space-y-1.5">
        <Label htmlFor="start_time">Start time</Label>
        <input
          id="start_time"
          name="start_time"
          type="time"
          required
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-invalid={!!state.fieldErrors?.start_time}
        />
        {state.fieldErrors?.start_time && (
          <p className="text-sm text-destructive">{state.fieldErrors.start_time[0]}</p>
        )}
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <Label htmlFor="duration_minutes">Duration</Label>
        <select
          id="duration_minutes"
          name="duration_minutes"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {DURATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Venue */}
      <div className="space-y-1.5">
        <Label htmlFor="venue">Venue</Label>
        {/* Hidden input to submit venue value with form */}
        <input type="hidden" name="venue" value={venue} />
        <VenueAutocomplete
          value={venue}
          onChange={setVenue}
          communityId={communityId}
          error={state.fieldErrors?.venue?.[0]}
        />
      </div>

      {/* Court number */}
      <div className="space-y-1.5">
        <Label htmlFor="court_number">Court number</Label>
        <Input
          id="court_number"
          name="court_number"
          type="text"
          value={courtNumber}
          onChange={e => setCourtNumber(e.target.value)}
          placeholder="Assign on the day"
        />
      </div>

      {/* Capacity */}
      <div className="space-y-1.5">
        <Label htmlFor="capacity">Capacity</Label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          min="1"
          required
          value={capacity}
          onChange={e => setCapacity(e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-invalid={!!state.fieldErrors?.capacity}
        />
        {state.fieldErrors?.capacity && (
          <p className="text-sm text-destructive">{state.fieldErrors.capacity[0]}</p>
        )}
      </div>

      {/* Start date */}
      <div className="space-y-1.5">
        <Label htmlFor="starts_on">Start date</Label>
        <input
          id="starts_on"
          name="starts_on"
          type="date"
          required
          value={startsOn}
          onChange={e => setStartsOn(e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-invalid={!!state.fieldErrors?.starts_on}
        />
        {state.fieldErrors?.starts_on && (
          <p className="text-sm text-destructive">{state.fieldErrors.starts_on[0]}</p>
        )}
      </div>

      {/* End date */}
      <div className="space-y-1.5">
        <Label htmlFor="ends_on">End date <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <input
          id="ends_on"
          name="ends_on"
          type="date"
          value={endsOn}
          onChange={e => setEndsOn(e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {/* Invite clients */}
      <div className="space-y-2">
        <Label>Invite clients</Label>
        {assignedClients.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clients assigned to you yet.</p>
        ) : (
          <div className="space-y-2">
            {assignedClients.map((client) => (
              <label key={client.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input accent-primary"
                  checked={invitedClientIds.includes(client.id)}
                  onChange={() => toggleClient(client.id)}
                />
                <span className="text-sm text-foreground">
                  {client.email}
                </span>
              </label>
            ))}
          </div>
        )}
        <input type="hidden" name="invited_client_ids" value={invitedClientIds.join(',')} />
        {state.fieldErrors?.invited_client_ids && (
          <p className="text-sm text-destructive">{state.fieldErrors.invited_client_ids[0]}</p>
        )}
      </div>

      {/* Co-coaches */}
      {availableCoaches.length > 0 && (
        <div className="space-y-2">
          <Label>Co-coaches <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <div className="space-y-2">
            {availableCoaches.map((coach) => (
              <label key={coach.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input accent-primary"
                  checked={coCoachIds.includes(coach.id)}
                  onChange={() => toggleCoCoach(coach.id)}
                />
                <span className="text-sm text-foreground">{coach.display_name}</span>
              </label>
            ))}
          </div>
          {/* Hidden input carries comma-separated co_coach_ids to server action */}
          <input type="hidden" name="co_coach_ids" value={coCoachIds.join(',')} />
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11"
      >
        {isPending ? 'Creating...' : 'Create sessions'}
      </Button>
    </form>
  )
}
