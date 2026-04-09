'use server'

import { createClient, getUserRole } from '@/lib/supabase/server'
import type { InviteLink } from '@/lib/types/auth'

// AUTH-05 + D-06 + D-07: Coaches and admins can generate invite links
export async function createInviteLink(
  communityId: string,
  communitySlug: string,
  role: 'coach' | 'client'
): Promise<{ success: boolean; data?: InviteLink; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }

  // Admins can create coach or client invites; coaches can only create client invites
  if (role === 'coach' && membership.role !== 'admin') {
    return { success: false, error: 'Only admins can create coach invite links' }
  }
  if (membership.role !== 'admin' && membership.role !== 'coach') {
    return { success: false, error: 'Only admins and coaches can create invite links' }
  }

  // communitySlug is accepted but not used in this action (invite links don't revalidate paths)
  void communitySlug

  const { data: invite, error } = await supabase
    .from('invite_links')
    .insert({
      community_id: communityId,
      created_by: membership.memberId,
      role,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data: invite as InviteLink }
}

// D-08: Invite links valid until manually revoked
export async function revokeInviteLink(
  communityId: string,
  communitySlug: string,
  inviteLinkId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }
  if (membership.role !== 'admin' && membership.role !== 'coach') {
    return { success: false, error: 'Only admins and coaches can revoke invite links' }
  }

  // communitySlug is accepted but not used in this action
  void communitySlug

  const { error } = await supabase
    .from('invite_links')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', inviteLinkId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
