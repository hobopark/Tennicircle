export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient, getUserRole } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { CancelRsvpButton } from '@/components/sessions/CancelRsvpButton'
import { RsvpSessionButton } from '@/components/sessions/RsvpSessionButton'

interface PageProps {
  params: Promise<{ slug: string; sessionId: string }>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-AU', {
    timeZone: 'Australia/Sydney', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-AU', {
    timeZone: 'Australia/Sydney', hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export default async function ClientSessionDetailPage({ params }: PageProps) {
  const { slug, sessionId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  // Fetch session with template title
  const { data: session } = await supabase
    .from('sessions')
    .select('*, session_templates(title)')
    .eq('id', sessionId)
    .single()

  if (!session) return notFound()

  // Get community + member
  const { data: community } = await supabase
    .from('communities')
    .select('id')
    .eq('slug', slug)
    .single()
  if (!community) return notFound()

  const membership = await getUserRole(supabase, community.id)
  const member = membership ? { id: membership.memberId } : null

  // Get user's RSVP for this session
  const { data: userRsvp } = member
    ? await supabase
        .from('session_rsvps')
        .select('*')
        .eq('session_id', sessionId)
        .eq('member_id', member.id)
        .is('cancelled_at', null)
        .single()
    : { data: null }

  // Check if user is on the invitation list for this template
  const isInvited = member && session.template_id
    ? !!(await supabase
        .from('session_invitations')
        .select('id')
        .eq('template_id', session.template_id)
        .eq('member_id', member.id)
        .maybeSingle()
      ).data
    : false

  const isCancelled = session.cancelled_at !== null
  const title = (session as Record<string, unknown>).session_templates
    ? ((session as Record<string, unknown>).session_templates as { title: string })?.title
    : null

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="max-w-[560px] mx-auto px-4 py-8">
          <Link
            href={`/c/${slug}/sessions`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Sessions
          </Link>

          {isCancelled && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-4 py-3 mb-4">
              <p className="text-[14px] text-destructive font-medium">
                Cancelled: {session.cancellation_reason}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1 mb-6">
            {title && (
              <h1 className="text-[20px] font-bold text-foreground">{title}</h1>
            )}
            <p className="text-[16px] text-foreground">{formatDate(session.scheduled_at)}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-muted-foreground">
              <span>{formatTime(session.scheduled_at)}</span>
              <span>{session.duration_minutes} min</span>
              <span>{session.venue}</span>
              {session.court_number && <span>Court No.{session.court_number}</span>}
            </div>
          </div>

          {/* RSVP status */}
          {!isCancelled && (
            <div className="rounded-xl border border-border bg-card p-4">
              {userRsvp ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-foreground">
                      {userRsvp.rsvp_type === 'confirmed' ? "You're confirmed" : "You're on the waitlist"}
                    </p>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      {userRsvp.rsvp_type === 'confirmed'
                        ? "You're all set for this session."
                        : `Position ${userRsvp.waitlist_position} on the waitlist.`}
                    </p>
                  </div>
                  <CancelRsvpButton sessionId={sessionId} />
                </div>
              ) : isInvited ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-medium text-foreground">
                      You&apos;re not attending
                    </p>
                    <p className="text-[13px] text-muted-foreground mt-0.5">
                      You&apos;re invited — join if there&apos;s space.
                    </p>
                  </div>
                  <RsvpSessionButton sessionId={sessionId} />
                </div>
              ) : (
                <p className="text-[14px] text-muted-foreground">
                  You are not currently attending this session.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
