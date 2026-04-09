import { createClient, getJWTClaims } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileSetupWizard } from '@/components/profile/ProfileSetupWizard'
import type { PlayerProfile } from '@/lib/types/profiles'
import type { UserRole } from '@/lib/types/auth'

export default async function ProfileSetupPage() {
  const supabase = await createClient()

  // Auth guard
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth')

  // Get JWT claims for communityId — refresh first in case user just joined
  await supabase.auth.refreshSession()
  const claims = await getJWTClaims(supabase)
  if (!claims.community_id) redirect('/welcome')

  const userRole = (claims.user_role as UserRole) ?? 'pending'

  // Fetch existing profile (edit mode)
  const { data: existingProfile } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('user_id', user.id)
    .eq('community_id', claims.community_id)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-5 pt-14 pb-24">
      <ProfileSetupWizard
        existingProfile={(existingProfile as PlayerProfile | null) ?? null}
        email={user.email ?? ''}
        communityId={claims.community_id}
        userId={user.id}
        userRole={userRole}
      />
    </div>
  )
}
