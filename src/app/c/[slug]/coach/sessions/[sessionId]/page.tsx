export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SessionDetailPanel } from '@/components/sessions/SessionDetailPanel'
import { InvitationManager } from '@/components/sessions/InvitationManager'
import { AppNav } from '@/components/nav/AppNav'
import { InitialsAvatar } from '@/components/profile/InitialsAvatar'
import { ProgressNoteForm } from '@/components/profile/ProgressNoteForm'
import type { Session, SessionRsvp } from '@/lib/types/sessions'

interface PageProps {
  params: Promise<{ slug: string; sessionId: string }>
}

interface RsvpWithName extends SessionRsvp {
  member_name: string
  member_avatar_url: string | null
}

interface CoachInfo {
  member_name: string
  is_primary: boolean
}

export default async function SessionDetailPage({ params }: PageProps) {
  const { slug, sessionId } = await params
  const supabase = await createClient()

  // Fetch session with template title
  const { data: session } = await supabase
    .from('sessions')
    .select('*, session_templates(title)')
    .eq('id', sessionId)
    .single()

  if (!session) notFound()

  // Fetch RSVPs with member info
  const { data: rsvpRows } = await supabase
    .from('session_rsvps')
    .select('*, community_members!inner(id, user_id)')
    .eq('session_id', sessionId)
    .order('created_at')

  const uniqueUserIds = [...new Set(
    (rsvpRows ?? [])
      .map((r: Record<string, unknown>) => {
        const cm = r.community_members as { user_id: string } | null
        return cm?.user_id
      })
      .filter(Boolean) as string[]
  )]

  // Build member ID -> display name + avatar map
  const memberNameMap = new Map<string, string>()
  const memberAvatarMap = new Map<string, string | null>()

  if (uniqueUserIds.length > 0) {
    const { data: playerProfiles } = await supabase
      .from('player_profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', uniqueUserIds)

    const profileByUserId = new Map(
      (playerProfiles ?? []).map(p => [p.user_id, p])
    )

    const { data: memberRows } = await supabase
      .from('community_members')
      .select('id, user_id, display_name')
      .in('user_id', uniqueUserIds)

    for (const m of memberRows ?? []) {
      const profile = profileByUserId.get(m.user_id)
      const name = profile?.display_name ?? m.display_name ?? 'Member'
      memberNameMap.set(m.id as string, name as string)
      memberAvatarMap.set(m.id as string, profile?.avatar_url ?? null)
    }
  }

  // Map RSVPs to include member_name and avatar
  const rsvps: RsvpWithName[] = (rsvpRows ?? []).map((r: Record<string, unknown>) => {
    const cm = r.community_members as { id: string; user_id: string } | null
    const memberName = cm ? (memberNameMap.get(cm.id) ?? 'Member') : 'Member'
    const memberAvatar = cm ? (memberAvatarMap.get(cm.id) ?? null) : null
    const { community_members: _cm, ...rsvpData } = r
    return {
      ...(rsvpData as unknown as SessionRsvp),
      member_name: memberName,
      member_avatar_url: memberAvatar,
    }
  })

  // Fetch coaches for this session
  const { data: coachRows } = await supabase
    .from('session_coaches')
    .select('member_id, is_primary, community_members!inner(id, user_id, display_name)')
    .eq('session_id', sessionId)

  const coachUserIds = (coachRows ?? []).map((c: Record<string, unknown>) => {
    const cm = c.community_members as { user_id: string } | null
    return cm?.user_id
  }).filter(Boolean) as string[]

  const { data: coachProfiles } = coachUserIds.length > 0
    ? await supabase.from('player_profiles').select('user_id, display_name').in('user_id', coachUserIds)
    : { data: [] }
  const coachProfileMap = new Map((coachProfiles ?? []).map(p => [p.user_id, p.display_name]))

  const coaches: CoachInfo[] = (coachRows ?? []).map((c: Record<string, unknown>) => {
    const cm = c.community_members as { display_name?: string; user_id: string } | null
    const name = (cm?.user_id ? coachProfileMap.get(cm.user_id) : null) ?? cm?.display_name ?? 'Coach'
    return {
      member_name: name,
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

  const confirmedRsvps = rsvps.filter(
    r => r.rsvp_type === 'confirmed' && !r.cancelled_at
  )

  // Fetch invitation list for this template
  const templateId = session.template_id
  const { data: invitationRows } = templateId
    ? await supabase
        .from('session_invitations')
        .select('member_id')
        .eq('template_id', templateId)
    : { data: [] }

  const invitedMemberIds = new Set((invitationRows ?? []).map(i => i.member_id))

  const sessionCommunityId = (session as { community_id?: string }).community_id

  const { data: allClients } = sessionCommunityId
    ? await supabase
        .from('community_members')
        .select('id, user_id')
        .eq('community_id', sessionCommunityId)
        .in('role', ['client', 'member'])
    : { data: [] }

  const clientUserIds = (allClients ?? []).map(c => c.user_id)
  const { data: clientProfiles } = clientUserIds.length > 0
    ? await supabase
        .from('player_profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', clientUserIds)
    : { data: [] }

  const clientProfileMap = new Map(
    (clientProfiles ?? []).map(p => [p.user_id, p])
  )

  const invitedPlayers = (allClients ?? [])
    .filter(c => invitedMemberIds.has(c.id))
    .map(c => {
      const profile = clientProfileMap.get(c.user_id)
      return {
        memberId: c.id,
        displayName: profile?.display_name ?? 'Player',
        avatarUrl: profile?.avatar_url ?? null,
      }
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  const availablePlayers = (allClients ?? [])
    .filter(c => !invitedMemberIds.has(c.id))
    .map(c => {
      const profile = clientProfileMap.get(c.user_id)
      return {
        memberId: c.id,
        displayName: profile?.display_name ?? 'Player',
        avatarUrl: profile?.avatar_url ?? null,
      }
    })
    .filter(p => p.displayName !== 'Player')
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {/* Back link */}
          <Link
            href={`/c/${slug}/coach/schedule`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Schedule
          </Link>

          <SessionDetailPanel
            session={session as Session}
            rsvps={rsvps}
            coaches={coaches}
          />

          {/* Invitation list */}
          {templateId && (
            <div className="mt-8">
              <InvitationManager
                templateId={templateId}
                invitedPlayers={invitedPlayers}
                availablePlayers={availablePlayers}
              />
            </div>
          )}

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
                          {rsvp.member_avatar_url ? (
                            <img
                              src={rsvp.member_avatar_url}
                              alt={rsvp.member_name}
                              className="w-8 h-8 rounded-xl object-cover flex-shrink-0"
                            />
                          ) : (
                            <InitialsAvatar
                              name={rsvp.member_name}
                              size={32}
                              className="rounded-xl"
                            />
                          )}
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
