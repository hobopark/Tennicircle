'use server'

import { createClient, getJWTClaims } from '@/lib/supabase/server'
import type { InviteLink } from '@/lib/types/auth'

// AUTH-05 + D-06 + D-07: Coaches and admins can generate invite links
export async function createInviteLink(
  role: 'coach' | 'client'
): Promise<{ success: boolean; data?: InviteLink; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const claims = await getJWTClaims(supabase)
  const userRole = claims.user_role
  const communityId = claims.community_id

  // Admins can create coach or client invites; coaches can only create client invites
  if (role === 'coach' && userRole !== 'admin') {
    return { success: false, error: 'Only admins can create coach invite links' }
  }
  if (userRole !== 'admin' && userRole !== 'coach') {
    return { success: false, error: 'Only admins and coaches can create invite links' }
  }
  if (!communityId) {
    return { success: false, error: 'No community associated with your account' }
  }

  // Get the current user's community_members record for created_by FK
  const { data: member } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!member) return { success: false, error: 'Member record not found' }

  const { data: invite, error } = await supabase
    .from('invite_links')
    .insert({
      community_id: communityId,
      created_by: member.id,
      role,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: invite as InviteLink }
}

// D-08: Invite links valid until manually revoked
export async function revokeInviteLink(
  inviteLinkId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('invite_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', inviteLinkId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
