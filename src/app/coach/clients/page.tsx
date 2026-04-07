import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient, getJWTClaims } from '@/lib/supabase/server'
import { AppNav } from '@/components/nav/AppNav'
import { InitialsAvatar } from '@/components/profile/InitialsAvatar'
import type { UserRole } from '@/lib/types/auth'

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  const claims = await getJWTClaims(supabase)
  const communityId = claims.community_id
  if (!communityId) redirect('/auth')

  const userRole = (claims.user_role as UserRole) ?? 'pending'
  if (userRole !== 'coach' && userRole !== 'admin') redirect('/sessions')

  // Get current user's member ID to exclude from list
  const { data: selfMember } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .maybeSingle()

  // Fetch community members who are clients
  const { data: members } = await supabase
    .from('community_members')
    .select('id, user_id, display_name, role')
    .eq('community_id', communityId)
    .in('role', ['client', 'member'])
    .neq('id', selfMember?.id ?? '')

  // Get player profiles for display names and avatars
  const userIds = (members ?? []).map(m => m.user_id)
  const { data: profiles } = userIds.length > 0
    ? await supabase
        .from('player_profiles')
        .select('user_id, display_name, avatar_url, self_skill_level')
        .eq('community_id', communityId)
        .in('user_id', userIds)
    : { data: [] }

  const profileMap = new Map(
    (profiles ?? []).map(p => [p.user_id, p])
  )

  // Get latest coach assessments for each member
  const memberIds = (members ?? []).map(m => m.id)
  const { data: assessments } = memberIds.length > 0
    ? await supabase
        .from('coach_assessments')
        .select('subject_member_id, skill_level, assessed_at')
        .eq('community_id', communityId)
        .in('subject_member_id', memberIds)
        .order('assessed_at', { ascending: false })
    : { data: [] }

  // Keep only the latest assessment per member
  const assessmentMap = new Map<string, { skill_level: string; assessed_at: string }>()
  for (const a of (assessments ?? [])) {
    if (!assessmentMap.has(a.subject_member_id)) {
      assessmentMap.set(a.subject_member_id, a)
    }
  }

  const players = (members ?? [])
    .map(m => {
      const profile = profileMap.get(m.user_id)
      const assessment = assessmentMap.get(m.id)
      return {
        id: m.id,
        displayName: profile?.display_name ?? m.display_name ?? 'Unnamed',
        avatarUrl: profile?.avatar_url ?? null,
        selfLevel: profile?.self_skill_level ?? null,
        coachLevel: assessment?.skill_level ?? null,
        hasProfile: !!profile,
      }
    })
    .filter(p => p.hasProfile)
    .sort((a, b) => a.displayName.localeCompare(b.displayName))

  return (
    <>
      <AppNav />
      <div className="min-h-screen bg-background">
        <div className="max-w-[640px] mx-auto px-5 py-8">
          <h1 className="font-heading font-bold text-2xl text-foreground mb-6">
            Clients ({players.length})
          </h1>

          {players.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No players have set up profiles yet.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {players.map(player => (
                <Link
                  key={player.id}
                  href={`/profile/${player.id}`}
                  className="flex items-center gap-4 p-4 bg-card rounded-2xl border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  {player.avatarUrl ? (
                    <img
                      src={player.avatarUrl}
                      className="w-10 h-10 rounded-xl object-cover"
                      alt={`${player.displayName}'s avatar`}
                    />
                  ) : (
                    <InitialsAvatar name={player.displayName} size={40} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {player.displayName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {player.coachLevel && (
                        <span className="text-xs text-primary font-medium">
                          {player.coachLevel.charAt(0).toUpperCase() + player.coachLevel.slice(1)}
                        </span>
                      )}
                      {!player.coachLevel && player.selfLevel && (
                        <span className="text-xs text-muted-foreground">
                          Self: {player.selfLevel.charAt(0).toUpperCase() + player.selfLevel.slice(1)}
                        </span>
                      )}
                      {!player.coachLevel && !player.selfLevel && (
                        <span className="text-xs text-muted-foreground">Not assessed</span>
                      )}
                    </div>
                  </div>
                  <span className="text-muted-foreground text-xs">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
