import { createClient } from '@/lib/supabase/server'
import { SessionCard } from '@/components/sessions/SessionCard'

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[560px] mx-auto px-4 py-8 text-center">
          <h1 className="font-display text-[20px] font-bold text-foreground mb-2">Not signed in</h1>
          <p className="text-[16px] text-muted-foreground">Please sign in to view your sessions.</p>
        </div>
      </div>
    )
  }

  // Get member record for current user
  const { data: member } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // Fetch upcoming sessions (RLS scopes to coach assignment for clients)
  const { data: sessions } = await supabase
    .from('sessions')
    .select('*, session_rsvps(*)')
    .gte('scheduled_at', new Date().toISOString())
    .order('scheduled_at', { ascending: true })

  // Fetch coach names: join sessions -> session_templates -> community_members for coach display name
  const templateIds = [...new Set((sessions ?? []).map((s: any) => s.template_id).filter(Boolean))]
  const { data: templates } = templateIds.length > 0
    ? await supabase
        .from('session_templates')
        .select('id, coach_id, community_members!inner(user_id)')
        .in('id', templateIds)
    : { data: [] }

  // Build coach_id -> user_id map from templates
  const coachNameMap = new Map<string, string>()
  for (const tmpl of (templates ?? []) as any[]) {
    const userId = tmpl.community_members?.user_id
    if (userId && !coachNameMap.has(tmpl.coach_id)) {
      coachNameMap.set(tmpl.coach_id, userId)
    }
  }

  // Fetch attendee names: for confirmed RSVPs, join member_id -> community_members -> user metadata
  const allMemberIds = [...new Set(
    (sessions ?? []).flatMap((s: any) =>
      (s.session_rsvps ?? [])
        .filter((r: any) => !r.cancelled_at && r.rsvp_type === 'confirmed')
        .map((r: any) => r.member_id)
    )
  )]
  const { data: memberProfiles } = allMemberIds.length > 0
    ? await supabase
        .from('community_members')
        .select('id, user_id, display_name')
        .in('id', allMemberIds)
    : { data: [] }

  const memberNameMap = new Map<string, string>()
  for (const mp of (memberProfiles ?? []) as any[]) {
    // Prefer display_name, fall back to user_id email prefix
    memberNameMap.set(mp.id, mp.display_name ?? mp.user_id?.split('@')[0] ?? 'Member')
  }

  // Enrich each session with computed fields
  const enrichedSessions = (sessions ?? []).map((session: any) => {
    const activeRsvps = (session.session_rsvps ?? []).filter((r: any) => !r.cancelled_at)
    const confirmed = activeRsvps.filter((r: any) => r.rsvp_type === 'confirmed')
    const userRsvp = activeRsvps.find((r: any) => r.member_id === member?.id) ?? null

    // Resolve coach name from template -> coach_id -> coachNameMap
    const tmpl = (templates ?? []).find((t: any) => t.id === session.template_id) as any
    const coachUserId = tmpl ? coachNameMap.get(tmpl.coach_id) : null
    const coachName = coachUserId ? coachUserId.split('@')[0] : 'Coach'

    // Resolve attendee names from confirmed RSVPs -> memberNameMap
    const attendeeNames = confirmed.slice(0, 5).map((r: any) => {
      return memberNameMap.get(r.member_id) ?? 'Member'
    })

    return {
      ...session,
      coach_name: coachName,
      confirmed_count: confirmed.length,
      waitlist_count: activeRsvps.filter((r: any) => r.rsvp_type === 'waitlisted').length,
      user_rsvp: userRsvp,
      attendee_names: attendeeNames,
    }
  })

  // Empty state (D-07 per UI-SPEC)
  if (enrichedSessions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-[560px] mx-auto px-4 py-8 text-center">
          <h1 className="font-display text-[20px] font-bold text-foreground mb-2">No sessions yet</h1>
          <p className="text-[16px] text-muted-foreground">Your coach hasn&apos;t scheduled any sessions yet. Check back soon.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[560px] mx-auto px-4 py-8">
        <h1 className="font-display text-[28px] font-bold text-foreground mb-6">Your Sessions</h1>
        <div className="flex flex-col gap-4">
          {enrichedSessions.map((session: any) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      </div>
    </div>
  )
}
