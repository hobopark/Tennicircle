export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { processInviteSignup } from '@/lib/actions/members'

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  if (!token) redirect('/communities')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/auth?invite=${token}`)

  // Process the invite for the logged-in user
  const result = await processInviteSignup(user.id, token)

  if (result.success) {
    // Find the community from the invite to redirect there
    const { data: invite } = await supabase
      .from('invite_links')
      .select('community_id')
      .eq('token', token)
      .maybeSingle()

    if (invite) {
      const { data: community } = await supabase
        .from('communities')
        .select('slug')
        .eq('id', invite.community_id)
        .single()

      if (community) {
        // Look up the user's role in this community to redirect to the right page
        const { data: membership } = await supabase
          .from('community_members')
          .select('role')
          .eq('user_id', user.id)
          .eq('community_id', invite.community_id)
          .single()

        const role = membership?.role as 'admin' | 'coach' | 'client' | undefined
        if (role === 'admin' || role === 'coach') {
          redirect(`/c/${community.slug}/coach`)
        }
        redirect(`/c/${community.slug}/sessions`)
      }
    }
  }

  // Fallback — already a member or invalid token
  redirect('/communities')
}
