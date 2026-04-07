'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createSessionTemplate } from '@/lib/actions/sessions'
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

const initialState: SessionActionResult = { success: false }

export function CreateSessionForm() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(createSessionTemplate, initialState)

  const [venue, setVenue] = useState('')
  const [communityId, setCommunityId] = useState('')
  const [coCoachIds, setCoCoachIds] = useState<string[]>([])
  const [availableCoaches, setAvailableCoaches] = useState<CoachOption[]>([])

  useEffect(() => {
    async function loadUserContext() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const cid = user.app_metadata?.community_id
      if (cid) setCommunityId(cid)

      // Get current member id to exclude self
      const { data: currentMember } = await supabase
        .from('community_members')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!currentMember || !cid) return

      // Fetch other coaches in community
      const { data: coaches } = await supabase
        .from('community_members')
        .select('id, display_name')
        .eq('community_id', cid)
        .eq('role', 'coach')
        .neq('id', currentMember.id)

      if (coaches) {
        setAvailableCoaches(coaches as CoachOption[])
      }
    }

    loadUserContext()
  }, [])

  useEffect(() => {
    if (state.success) {
      router.push('/coach')
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state, router])

  function toggleCoCoach(id: string) {
    setCoCoachIds((prev) =>
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
          defaultValue="60"
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
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
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
