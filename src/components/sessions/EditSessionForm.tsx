'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { editSession } from '@/lib/actions/sessions'
import { useCommunity } from '@/lib/context/community'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Session, SessionActionResult } from '@/lib/types/sessions'

interface EditSessionFormProps {
  session: Session & { session_templates?: { title: string } | null }
  templateId: string | null
}

type EditScope = 'this' | 'future'

const DURATION_OPTIONS = [
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '90', label: '90 min' },
  { value: '120', label: '120 min' },
]

function formatDate(scheduledAt: string): string {
  const date = new Date(scheduledAt)
  return date.toLocaleDateString('en-AU', {
    timeZone: 'Australia/Sydney',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function extractTime(scheduledAt: string): string {
  // Extract HH:MM in Sydney timezone (server interprets submitted time as Sydney)
  const date = new Date(scheduledAt)
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Australia/Sydney',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export function EditSessionForm({ session, templateId }: EditSessionFormProps) {
  const { communityId, communitySlug } = useCommunity()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [scope, setScope] = useState<EditScope | null>(null)
  const [showForm, setShowForm] = useState(templateId === null) // Skip scope dialog for one-off sessions
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  const formattedDate = formatDate(session.scheduled_at)
  const currentTime = extractTime(session.scheduled_at)

  function handleContinue() {
    if (!scope) return
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFieldErrors({})

    const formData = new FormData(e.currentTarget)
    const effectiveScope: EditScope = templateId === null ? 'this' : (scope ?? 'this')

    startTransition(async () => {
      const result: SessionActionResult = await editSession(communityId, communitySlug, session.id, effectiveScope, formData)

      if (result.success) {
        toast.success('Session updated')
        router.push(`/c/${communitySlug}/coach`)
      } else if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors)
      } else {
        toast.error(result.error ?? 'Something went wrong. Please try again.')
      }
    })
  }

  // Scope selection screen (D-14 per UI-SPEC) — only shown for templated sessions
  if (!showForm && templateId !== null) {
    return (
      <div className="space-y-4">
        <p className="text-base text-muted-foreground">Choose which sessions to update.</p>

        {/* This session only */}
        <button
          type="button"
          onClick={() => setScope('this')}
          className={[
            'w-full rounded-2xl border p-4 text-left transition-colors',
            scope === 'this'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
              : 'border-border bg-card hover:bg-muted',
          ].join(' ')}
        >
          <p className="font-display text-[20px] font-bold text-foreground">This session only</p>
          <p className="mt-1 text-base text-muted-foreground">Only {formattedDate} will change</p>
        </button>

        {/* This and all future sessions */}
        <button
          type="button"
          onClick={() => setScope('future')}
          className={[
            'w-full rounded-2xl border p-4 text-left transition-colors',
            scope === 'future'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
              : 'border-border bg-card hover:bg-muted',
          ].join(' ')}
        >
          <p className="font-display text-[20px] font-bold text-foreground">This and all future sessions</p>
          <p className="mt-1 text-base text-muted-foreground">
            All sessions from {formattedDate} onward will change
          </p>
        </button>

        <Button
          type="button"
          onClick={handleContinue}
          disabled={scope === null}
          className="w-full h-11"
        >
          Continue
        </Button>
      </div>
    )
  }

  // Edit form
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title — only editable in "future" scope since it's a template property */}
      <div className="space-y-1.5">
        <Label htmlFor="title">Session title {scope === 'this' && <span className="text-muted-foreground font-normal">(edit all future to change)</span>}</Label>
        <Input
          id="title"
          name={scope === 'future' || templateId === null ? 'title' : undefined}
          type="text"
          defaultValue={session.session_templates?.title ?? ''}
          placeholder="e.g. Tuesday Evening Group"
          disabled={scope === 'this' && templateId !== null}
          aria-invalid={!!fieldErrors.title}
        />
        {fieldErrors.title && (
          <p className="text-sm text-destructive">{fieldErrors.title[0]}</p>
        )}
      </div>

      {/* Venue */}
      <div className="space-y-1.5">
        <Label htmlFor="venue">Venue</Label>
        <Input
          id="venue"
          name="venue"
          type="text"
          defaultValue={session.venue}
          placeholder="e.g. Moore Park Tennis Club"
          aria-invalid={!!fieldErrors.venue}
        />
        {fieldErrors.venue && (
          <p className="text-sm text-destructive">{fieldErrors.venue[0]}</p>
        )}
      </div>

      {/* Capacity */}
      <div className="space-y-1.5">
        <Label htmlFor="capacity">Capacity</Label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          min="1"
          defaultValue={session.capacity}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-invalid={!!fieldErrors.capacity}
        />
        {fieldErrors.capacity && (
          <p className="text-sm text-destructive">{fieldErrors.capacity[0]}</p>
        )}
      </div>

      {/* Start time */}
      <div className="space-y-1.5">
        <Label htmlFor="start_time">Start time</Label>
        <input
          id="start_time"
          name="start_time"
          type="time"
          defaultValue={currentTime}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          aria-invalid={!!fieldErrors.start_time}
        />
        {fieldErrors.start_time && (
          <p className="text-sm text-destructive">{fieldErrors.start_time[0]}</p>
        )}
      </div>

      {/* Duration */}
      <div className="space-y-1.5">
        <Label htmlFor="duration_minutes">Duration</Label>
        <select
          id="duration_minutes"
          name="duration_minutes"
          defaultValue={String(session.duration_minutes)}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {DURATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Court number */}
      <div className="space-y-1.5">
        <Label htmlFor="court_number">Court number <span className="text-muted-foreground font-normal">(optional)</span></Label>
        <Input
          id="court_number"
          name="court_number"
          type="text"
          defaultValue={session.court_number ?? ''}
          placeholder="Assign on the day"
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="w-full h-11"
      >
        {isPending ? 'Saving...' : 'Save changes'}
      </Button>
    </form>
  )
}
