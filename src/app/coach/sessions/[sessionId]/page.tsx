import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SessionDetailPanel } from '@/components/sessions/SessionDetailPanel'
import { AppNav } from '@/components/nav/AppNav'
import { InitialsAvatar } from '@/components/profile/InitialsAvatar'
import { ProgressNoteForm } from '@/components/profile/ProgressNoteForm'
import type { Session, SessionRsvp } from '@/lib/types/sessions'

interface PageProps {
  params: Promise<{ sessionId: string }>
}

interface RsvpWithName extends SessionRsvp {
  member_name: string
}

interface CoachInfo {
  member_name: string
  is_primary: boolean
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { sessionId } = await params
  const supabase = await createClient()

  // Fetch session with template title
  const { data: session } = await supabase
    .from('sessions')
    .select('*, session_templates(title)')
    .eq('id', sessionId)
    .single()

  if (!session) notFound()

  // Fetch RSVPs with member info
  // We join through community_members to get user_id, then look up display name
  const { data: rsvpRows } = await supabase
    .from('session_rsvps')
    .select('*, community_members!inner(id, user_id)')
    .eq('session_id', sessionId)
    .order('created_at')

  // Build member name lookup from auth.users via community_members
  // Since we can't join auth.users directly from the anon client, we use the email from auth.users
  // by fetching user records for each unique user_id
  const uniqueUserIds = [...new Set(
    (rsvpRows ?? [])
      .map((r: Record<string, unknown>) => {
        const cm = r.community_members as { user_id: string } | null
        return cm?.user_id
      })
      .filter(Boolean) as string[]
  )]

  // Build member ID -> display name map (prefer player_profiles over community_members)
  const memberNameMap = new Map<string, string>()

  if (uniqueUserIds.length > 0) {
    // Fetch from player_profiles first (has the real display name)
    const { data: playerProfiles } = await supabase
      .from('player_profiles')
      .select('user_id, display_name')
      .in('user_id', uniqueUserIds)

    const profileNameByUserId = new Map(
      (playerProfiles ?? []).map(p => [p.user_id, p.display_name])
    )

    // Fetch community_members to map member_id -> user_id
    const { data: memberRows } = await supabase
      .from('community_members')
      .select('id, user_id, display_name')
      .in('user_id', uniqueUserIds)

    for (const m of memberRows ?? []) {
      const name = profileNameByUserId.get(m.user_id) ?? m.display_name ?? 'Member'
      memberNameMap.set(m.id as string, name as string)
    }
  }

  // Map RSVPs to include member_name
  const rsvps: RsvpWithName[] = (rsvpRows ?? []).map((r: Record<string, unknown>) => {
    const cm = r.community_members as { id: string; user_id: string } | null
    const memberName = cm ? (memberNameMap.get(cm.id) ?? cm.user_id ?? 'Unknown') : 'Unknown'
    const { community_members: _cm, ...rsvpData } = r
    return {
      ...(rsvpData as unknown as SessionRsvp),
      member_name: memberName,
    }
  })

  // Fetch coaches for this session
  const { data: coachRows } = await supabase
    .from('session_coaches')
    .select('member_id, is_primary, community_members!inner(id, user_id, display_name)')
    .eq('session_id', sessionId)

  const coaches: CoachInfo[] = (coachRows ?? []).map((c: Record<string, unknown>) => {
    const cm = c.community_members as { display_name?: string; user_id: string } | null
    return {
      member_name: cm?.display_name ?? cm?.user_id ?? 'Coach',
      is_primary: Boolean(c.is_primary),
    }
  })

  // Fetch existing progress notes for this session
  const { data: existingNotes } = await supabase
    .from('progress_notes')
    .select('subject_member_id, note_text')
    .eq('session_id', sessionId)

  const notesByMember = new Map<string, string>(
    (existingNotes ?? []).map((n: { subject_member_id: string; note_text: string }) => [
      n.subject_member_id,
      n.note_text,
    ])
  )

  // Confirmed (non-cancelled) RSVPs for progress note entry
  const confirmedRsvps = rsvps.filter(
    r => r.rsvp_type === 'confirmed' && !r.cancelled_at
  )

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Back link */}
          <Link
            href="/coach"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to schedule
          </Link>

          <SessionDetailPanel
            session={session as Session}
            rsvps={rsvps}
            coaches={coaches}
          />

          {/* Progress Notes section */}
          {confirmedRsvps.length > 0 && (
            <div className="mt-8">
              <h2 className="font-heading font-bold text-base mt-8 mb-2">Progress Notes</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Add notes for each player you coached today.
              </p>
              <div className="flex flex-col gap-3">
                {confirmedRsvps.map(rsvp => {
                  const existingNote = notesByMember.get(rsvp.member_id)
                    ? { note_text: notesByMember.get(rsvp.member_id)! }
                    : null
                  return (
                    <div
                      key={rsvp.member_id}
                      className="bg-card rounded-2xl border border-border/50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <InitialsAvatar
                            name={rsvp.member_name}
                            size={32}
                            className="rounded-xl"
                          />
                          <span className="text-sm font-bold text-foreground">
                            {rsvp.member_name}
                          </span>
                        </div>
                        <div className="flex-1">
                          <ProgressNoteForm
                            sessionId={sessionId}
                            subjectMemberId={rsvp.member_id}
                            playerName={rsvp.member_name}
                            existingNote={existingNote}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
