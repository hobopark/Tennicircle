'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Trophy, PartyPopper, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { createEvent } from '@/lib/actions/events'
import { createAnnouncement } from '@/lib/actions/announcements'
import type { EventType, EventActionResult, AnnouncementActionResult } from '@/lib/types/events'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DrawImageUpload } from './DrawImageUpload'

interface CreateEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isAnnouncement?: boolean
  userRole: string
  communityId?: string
}

type Step = 'type-select' | 'form'

const EVENT_TYPE_OPTIONS: {
  type: EventType
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    type: 'tournament',
    label: 'Tournament',
    description: 'Post a bracket or competition',
    icon: <Trophy size={20} className="text-secondary-foreground" />,
  },
  {
    type: 'social',
    label: 'Social Event',
    description: 'Drinks, dinners, casual meetups',
    icon: <PartyPopper size={20} className="text-primary" />,
  },
  {
    type: 'open_session',
    label: 'Open Session',
    description: 'Court time anyone can join',
    icon: <Zap size={20} className="text-muted-foreground" />,
  },
]

const initialEventState: EventActionResult = { success: false }
const initialAnnouncementState: AnnouncementActionResult = { success: false }

export function CreateEventDialog({
  open,
  onOpenChange,
  isAnnouncement = false,
  userRole,
  communityId,
}: CreateEventDialogProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(isAnnouncement ? 'form' : 'type-select')
  const [selectedType, setSelectedType] = useState<EventType>('social')
  const [drawImageUrl, setDrawImageUrl] = useState<string>('')

  // Field error state for local clearing on change
  const [localFieldErrors, setLocalFieldErrors] = useState<Record<string, string | undefined>>({})

  const [eventState, eventAction, isEventPending] = useActionState(createEvent, initialEventState)
  const [announcementState, announcementAction, isAnnouncementPending] = useActionState(
    createAnnouncement,
    initialAnnouncementState
  )

  const isPending = isEventPending || isAnnouncementPending

  // Sync step when dialog opens or isAnnouncement changes
  useEffect(() => {
    if (open) {
      setStep(isAnnouncement ? 'form' : 'type-select')
    } else {
      setStep(isAnnouncement ? 'form' : 'type-select')
      setSelectedType('social')
      setDrawImageUrl('')
      setLocalFieldErrors({})
    }
  }, [open, isAnnouncement])

  // Handle event creation success
  useEffect(() => {
    if (eventState.success) {
      onOpenChange(false)
      toast.success('Event created')
      router.refresh()
    }
  }, [eventState.success, onOpenChange, router])

  // Handle announcement creation success
  useEffect(() => {
    if (announcementState.success) {
      onOpenChange(false)
      toast.success('Announcement posted')
      router.refresh()
    }
  }, [announcementState.success, onOpenChange, router])

  function getFieldError(field: string): string | undefined {
    // Local state takes priority (cleared on change), then server state
    if (localFieldErrors[field] !== undefined) {
      return localFieldErrors[field] || undefined
    }
    const serverErrors = isAnnouncement
      ? announcementState.fieldErrors
      : eventState.fieldErrors
    return serverErrors?.[field]?.[0]
  }

  function clearFieldError(field: string) {
    setLocalFieldErrors(prev => ({ ...prev, [field]: '' }))
  }

  const formTitle = isAnnouncement
    ? 'Post Announcement'
    : selectedType === 'tournament'
    ? 'Tournament details'
    : selectedType === 'social'
    ? 'Social Event details'
    : 'Open Session details'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="rounded-3xl border border-border/50 max-sm:fixed max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:max-w-full overflow-y-auto max-h-[90dvh]"
        showCloseButton={false}
      >
        {/* Step 1: Type selector */}
        {step === 'type-select' && !isAnnouncement && (
          <div>
            <DialogHeader>
              <DialogTitle className="font-heading font-bold text-2xl">
                What type of event?
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-4">
              {EVENT_TYPE_OPTIONS.map(option => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => {
                    setSelectedType(option.type)
                    setStep('form')
                  }}
                  className="bg-muted rounded-2xl p-4 h-16 flex items-center gap-4 border border-border cursor-pointer transition-colors active:scale-[0.98] hover:border-primary hover:bg-primary/5 text-left"
                >
                  {option.icon}
                  <div>
                    <p className="font-heading font-bold text-base leading-tight">
                      {option.label}
                    </p>
                    <p className="text-sm text-muted-foreground leading-tight">
                      {option.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Form */}
        {step === 'form' && (
          <div>
            <DialogHeader>
              <DialogTitle className="font-heading font-bold text-2xl">
                {formTitle}
              </DialogTitle>
            </DialogHeader>

            {!isAnnouncement && (
              <button
                type="button"
                onClick={() => setStep('type-select')}
                className="text-sm text-muted-foreground hover:underline mt-1 mb-2"
              >
                Back
              </button>
            )}

            {isAnnouncement ? (
              /* Announcement form */
              <form action={announcementAction} className="flex flex-col gap-4 mt-4">
                {announcementState.error && (
                  <p className="text-destructive text-sm">{announcementState.error}</p>
                )}

                <div>
                  <Label htmlFor="ann-title">Title</Label>
                  <Input
                    id="ann-title"
                    name="title"
                    required
                    maxLength={80}
                    className="h-12 rounded-2xl mt-1"
                    onChange={() => clearFieldError('title')}
                  />
                  {getFieldError('title') && (
                    <p className="text-destructive text-sm mt-1">{getFieldError('title')}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="ann-body">Announcement</Label>
                  <Textarea
                    id="ann-body"
                    name="body"
                    required
                    maxLength={400}
                    className="min-h-20 rounded-2xl mt-1"
                    onChange={() => clearFieldError('body')}
                  />
                  {getFieldError('body') && (
                    <p className="text-destructive text-sm mt-1">{getFieldError('body')}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 rounded-2xl font-heading font-bold bg-primary text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="animate-spin" size={16} />}
                  Post Announcement
                </button>
              </form>
            ) : (
              /* Event creation form */
              <form action={eventAction} className="flex flex-col gap-4 mt-4">
                {/* Hidden event type */}
                <input type="hidden" name="event_type" value={selectedType} />
                {/* Hidden draw image url (for tournament) */}
                {drawImageUrl && (
                  <input type="hidden" name="draw_image_url" value={drawImageUrl} />
                )}

                {eventState.error && (
                  <p className="text-destructive text-sm">{eventState.error}</p>
                )}

                <div>
                  <Label htmlFor="event-title">Title</Label>
                  <Input
                    id="event-title"
                    name="title"
                    required
                    className="h-12 rounded-2xl mt-1"
                    onChange={() => clearFieldError('title')}
                  />
                  {getFieldError('title') && (
                    <p className="text-destructive text-sm mt-1">{getFieldError('title')}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="event-date">Date</Label>
                  <Input
                    id="event-date"
                    name="starts_at_date"
                    type="date"
                    required
                    className="h-12 rounded-2xl mt-1"
                    onChange={() => clearFieldError('starts_at_date')}
                  />
                  {getFieldError('starts_at_date') && (
                    <p className="text-destructive text-sm mt-1">{getFieldError('starts_at_date')}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="event-time">Start time</Label>
                  <Input
                    id="event-time"
                    name="starts_at_time"
                    type="time"
                    required
                    className="h-12 rounded-2xl mt-1"
                    onChange={() => clearFieldError('starts_at_time')}
                  />
                  {getFieldError('starts_at_time') && (
                    <p className="text-destructive text-sm mt-1">{getFieldError('starts_at_time')}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="event-venue">Venue</Label>
                  <Input
                    id="event-venue"
                    name="venue"
                    required
                    className="h-12 rounded-2xl mt-1"
                    onChange={() => clearFieldError('venue')}
                  />
                  {getFieldError('venue') && (
                    <p className="text-destructive text-sm mt-1">{getFieldError('venue')}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="event-description">Description (optional)</Label>
                  <Textarea
                    id="event-description"
                    name="description"
                    className="min-h-20 rounded-2xl mt-1"
                    onChange={() => clearFieldError('description')}
                  />
                  {getFieldError('description') && (
                    <p className="text-destructive text-sm mt-1">{getFieldError('description')}</p>
                  )}
                </div>

                {/* Tournament-only: draw image upload */}
                {selectedType === 'tournament' && communityId && (
                  <div>
                    <Label>Draw image</Label>
                    <div className="mt-1">
                      <DrawImageUpload
                        communityId={communityId}
                        onUpload={setDrawImageUrl}
                      />
                    </div>
                  </div>
                )}

                {/* Max attendees (optional, all event types) */}
                {selectedType && (
                  <div>
                    <Label htmlFor="event-capacity">Max attendees (optional)</Label>
                    <Input
                      id="event-capacity"
                      name="capacity"
                      type="number"
                      min="1"
                      className="h-12 rounded-2xl mt-1"
                      onChange={() => clearFieldError('capacity')}
                    />
                    {getFieldError('capacity') && (
                      <p className="text-destructive text-sm mt-1">{getFieldError('capacity')}</p>
                    )}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-12 rounded-2xl font-heading font-bold bg-primary text-primary-foreground flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="animate-spin" size={16} />}
                  Create Event
                </button>
              </form>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
