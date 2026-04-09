import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileSetupWizard } from '@/components/profile/ProfileSetupWizard'
import type { PlayerProfile } from '@/lib/types/profiles'
import type { UserRole } from '@/lib/types/auth'

export default async function ProfileSetupPage() {
  const supabase = await createClient()

  // Auth guard
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // D-15: Profile setup happens before community selection.
  // Check if user already has a community membership (invite flow creates membership
  // during processInviteSignup in /auth/confirm callback — before arriving here).
  const { data: firstMembership } = await supabase
    .from('community_members')
    .select('id, role, community_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  // Invite flow: user has membership → create community-specific profile
  // Open sign-up: user has no membership → create global profile (community_id = null)
  const communityId = firstMembership?.community_id ?? null
  const userRole = (firstMembership?.role as UserRole) ?? 'client'

  // Check for existing profile (global OR community-specific)
  let existingProfile: PlayerProfile | null = null
  if (communityId !== null) {
    const { data } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('community_id', communityId)
      .maybeSingle()
    existingProfile = (data as PlayerProfile | null) ?? null
  } else {
    // Global profile: use .is('community_id', null) — eq doesn't match NULL in PostgREST
    const { data } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('user_id', user.id)
      .is('community_id', null)
      .maybeSingle()
    existingProfile = (data as PlayerProfile | null) ?? null
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-5 pt-14 pb-24">
      <ProfileSetupWizard
        existingProfile={existingProfile}
        email={user.email ?? ''}
        communityId={communityId}
        userId={user.id}
        userRole={userRole}
      />
    </div>
  )
}
