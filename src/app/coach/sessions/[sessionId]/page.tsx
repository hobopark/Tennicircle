import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SessionDetailPanel } from '@/components/sessions/SessionDetailPanel'
import { AppNav } from '@/components/nav/AppNav'
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

  // Build user ID -> display name map
  const memberNameMap = new Map<string, string>()

  if (uniqueUserIds.length > 0) {
    // Fetch display names from community_members (display_name or email fallback)
    const { data: memberProfiles } = await supabase
      .from('community_members')
      .select('id, user_id, display_name')
      .in('user_id', uniqueUserIds)

    for (const profile of memberProfiles ?? []) {
      const displayName = profile.display_name ?? profile.user_id
      memberNameMap.set(profile.id as string, displayName as string)
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
        </div>
      </div>
    </>
  )
}
