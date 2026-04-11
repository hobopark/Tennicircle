'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { NotificationActionResult } from '@/lib/types/notifications'

// Mark all unread notifications as read for the authenticated member
export async function markAllNotificationsRead(
  communityId: string,
  communitySlug: string
): Promise<NotificationActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Look up community_members.id scoped to current community (multi-community safe)
  const { data: member, error: memberError } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .maybeSingle()

  if (memberError || !member) return { success: false, error: 'Member record not found' }

  // Update all unread notifications for this member (T-05-02: member_id scoping)
  const { error: updateError } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('member_id', member.id)
    .is('read_at', null)

  if (updateError) return { success: false, error: updateError.message }

  revalidatePath(`/c/${communitySlug}/notifications`)
  return { success: true }
}

// Mark a single notification as read for the authenticated member
export async function markNotificationRead(
  communityId: string,
  communitySlug: string,
  notificationId: string
): Promise<NotificationActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Look up community_members.id scoped to current community (multi-community safe)
  const { data: member, error: memberError } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .maybeSingle()

  if (memberError || !member) return { success: false, error: 'Member record not found' }

  // Update single notification matching both id and member_id (T-05-02: prevents marking other members' notifications)
  const { error: updateError } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('member_id', member.id)

  if (updateError) return { success: false, error: updateError.message }

  revalidatePath(`/c/${communitySlug}/notifications`)
  return { success: true }
}
