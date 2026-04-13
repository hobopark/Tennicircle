export const dynamic = 'force-dynamic'

import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarDays, Clock, MapPin, Pencil, ChevronLeft } from 'lucide-react'
import { createClient, getUserRole, getCachedUser, getCachedCommunityBySlug } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { EventRsvpButton } from '@/components/events/EventRsvpButton'
import { DeleteEventButton } from '@/components/events/DeleteEventButton'
import { EVENT_TYPE_LABELS } from '@/lib/types/events'
import type { EventRsvp, EventType } from '@/lib/types/events'
import { EVENT_TYPE_BADGE_CLASSES as TYPE_BADGE_CLASSES } from '@/lib/constants/events'

function formatEventDate(startsAt: string): string {
  const tz = 'Australia/Sydney'
  const date = new Date(startsAt)
  return date.toLocaleDateString('en-AU', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) + ' · ' + date.toLocaleTimeString('en-AU', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

interface EventDetailPageProps {
  params: Promise<{ slug: string; eventId: string }>
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { slug, eventId } = await params

  const supabase = await createClient()
  const user = await getCachedUser()

  if (!user) {
    return (
      <>
        <AppNav />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <p className="text-muted-foreground">Please sign in to view this event.</p>
        </div>
      </>
    )
  }

  const community = await getCachedCommunityBySlug(slug)
  if (!community) return notFound()

  const membership = await getUserRole(supabase, community.id)
  if (!membership) return notFound()
  const { role, memberId } = membership
  const userRole = role

  // Fetch event with creator info
  const { data: event } = await supabase
    .from('events')
    .select('*, creator:community_members!created_by(display_name)')
    .eq('id', eventId)
    .single()

  if (!event || event.cancelled_at) return notFound()

  // Fetch all RSVPs for this event with member info
  const { data: rsvps } = await supabase
    .from('event_rsvps')
    .select('*, member:community_members(display_name, user_id)')
    .eq('event_id', eventId)
    .is('cancelled_at', null)
    .order('created_at', { ascending: true })

  // Fetch profile names for RSVP members
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rsvpUserIds = (rsvps ?? []).map((r: any) => r.member?.user_id).filter(Boolean)
  const { data: rsvpProfiles } = rsvpUserIds.length > 0
    ? await supabase
        .from('player_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', rsvpUserIds)
    : { data: [] }

  const profileByUserId = new Map(
    (rsvpProfiles ?? []).map(p => [p.user_id, p])
  )

  // Fetch current user's RSVP
  const { data: userRsvpRow } = await supabase
    .from('event_rsvps')
    .select('*')
    .eq('event_id', eventId)
    .eq('member_id', memberId)
    .is('cancelled_at', null)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const confirmedRsvps = (rsvps ?? []).filter((r: any) => r.rsvp_type === 'confirmed').map((r: any) => {
    const profile = profileByUserId.get(r.member?.user_id)
    return {
      ...r,
      _displayName: profile?.display_name ?? r.member?.display_name ?? 'Member',
      _avatarUrl: profile?.avatar_url ?? null,
    }
  })
  const confirmedCount = confirmedRsvps.length
  const spotsLeft = event.capacity !== null ? event.capacity - confirmedCount : null

  const isCreator = event.created_by === memberId
  const canEdit = userRole === 'admin' || isCreator
  const canDelete = userRole === 'admin' || userRole === 'coach' || isCreator

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="px-5 pt-14 pb-24 max-w-[640px] mx-auto">
          <Link
            href={`/c/${slug}/events`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Events
          </Link>

          {/* Header card */}
          <div className="bg-card rounded-3xl border border-border/50 p-6 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className={TYPE_BADGE_CLASSES[event.event_type as EventType]}>
                {EVENT_TYPE_LABELS[event.event_type as EventType]}
              </span>
              <div className="flex items-center gap-2">
                {canEdit && (
                  <Link
                    href={`/c/${slug}/events/${eventId}/edit`}
                    aria-label="Edit event"
                    className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center"
                  >
                    <Pencil size={16} className="text-muted-foreground" />
                  </Link>
                )}
                {canDelete && (
                  <DeleteEventButton eventId={eventId} />
                )}
              </div>
            </div>

            <h1 className="font-heading font-bold text-2xl mb-3">{event.title}</h1>

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <CalendarDays className="w-4 h-4 flex-shrink-0" />
              <span>{formatEventDate(event.starts_at)}</span>
            </div>

            {event.duration_minutes && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>{event.duration_minutes >= 60 ? `${Math.floor(event.duration_minutes / 60)}h${event.duration_minutes % 60 ? ` ${event.duration_minutes % 60}m` : ''}` : `${event.duration_minutes} min`}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{event.venue}</span>
            </div>

            {event.creator?.display_name && (
              <p className="text-[10px] text-muted-foreground">
                Created by {event.creator.display_name}
              </p>
            )}
          </div>

          {/* RSVP card */}
          <div className="bg-card rounded-3xl border border-border/50 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-heading font-bold text-2xl text-foreground">
                  {confirmedCount}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold ml-2">
                  GOING
                </span>
              </div>
              {spotsLeft !== null && (
                <span className="text-[10px] font-bold bg-card/90 px-3 py-1 rounded-full text-primary border border-primary/20">
                  {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}
                </span>
              )}
            </div>

            <EventRsvpButton
              eventId={eventId}
              userRsvp={userRsvpRow as EventRsvp | null}
            />

            {/* Attendee list */}
            {confirmedRsvps.length > 0 && (
              <div className="mt-4 flex flex-col gap-2 border-t border-border/50 pt-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {confirmedRsvps.map((rsvp: any) => (
                  <div key={rsvp.id} className="flex items-center gap-3">
                    {rsvp._avatarUrl ? (
                      <Image
                        src={rsvp._avatarUrl}
                        width={32}
                        height={32}
                        alt={rsvp._displayName}
                        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                        unoptimized
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                        {rsvp._displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-sm text-foreground flex-1">
                      {rsvp._displayName}
                    </span>
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                      Going
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description card */}
          {event.description && (
            <div className="bg-card rounded-3xl border border-border/50 p-4 mb-4">
              <h2 className="font-heading font-bold text-base mb-2">About</h2>
              <p className="text-sm text-foreground">{event.description}</p>
            </div>
          )}

          {/* Tournament draw card */}
          {event.event_type === 'tournament' && (
            <div className="bg-card rounded-3xl border border-border/50 overflow-hidden mb-4">
              {event.draw_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.draw_image_url}
                  alt="Tournament draw"
                  className="w-full object-contain max-h-96"
                />
              ) : (
                <div className="p-4">
                  <h2 className="font-heading font-bold text-base mb-2">Tournament Draw</h2>
                  <p className="text-sm text-muted-foreground">No draw posted yet.</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
