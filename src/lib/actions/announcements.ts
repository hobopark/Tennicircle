'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getUserRole } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { CreateAnnouncementSchema } from '@/lib/validations/events'
import type { AnnouncementActionResult } from '@/lib/types/events'

// EVNT-02: Coach/admin posts a community announcement
export async function createAnnouncement(
  communityId: string,
  communitySlug: string,
  _prevState: AnnouncementActionResult,
  formData: FormData
): Promise<AnnouncementActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }

  // T-04-05: Role check — only coaches and admins can post announcements
  if (membership.role !== 'coach' && membership.role !== 'admin') {
    return { success: false, error: 'Only coaches and admins can post announcements' }
  }

  // Get member record
  const { data: member, error: memberError } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .single()

  if (memberError || !member) return { success: false, error: 'Member record not found' }

  // Parse and validate form data
  const parsed = CreateAnnouncementSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const { data: insertedAnnouncement, error: insertError } = await supabase
    .from('announcements')
    .insert({
      community_id: communityId,
      created_by: member.id,
      title: parsed.data.title,
      body: parsed.data.body,
    })
    .select()
    .single()

  if (insertError) return { success: false, error: insertError.message }

  // NOTF-02: Notify all community members about new announcement (fire-and-forget)
  const { data: members } = await supabase
    .from('community_members')
    .select('id')
    .eq('community_id', communityId)
    .neq('id', member.id) // Don't notify the poster

  if (members && members.length > 0) {
    const serviceClient = createServiceClient()
    const notificationRows = members.map(m => ({
      community_id: communityId,
      member_id: m.id,
      notification_type: 'announcement' as const,
      title: `New announcement: ${parsed.data.title}`,
      body: parsed.data.body.substring(0, 120),
      metadata: { announcement_id: insertedAnnouncement.id },
    }))
    serviceClient.from('notifications').insert(notificationRows).then(() => {})
  }

  revalidatePath(`/c/${communitySlug}/events`)

  return { success: true, data: insertedAnnouncement }
}

// Update an existing announcement
export async function updateAnnouncement(
  communityId: string,
  communitySlug: string,
  announcementId: string,
  _prevState: AnnouncementActionResult,
  formData: FormData
): Promise<AnnouncementActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }
  if (membership.role !== 'coach' && membership.role !== 'admin') {
    return { success: false, error: 'Only coaches and admins can edit announcements' }
  }

  const parsed = CreateAnnouncementSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const { data: updated, error } = await supabase
    .from('announcements')
    .update({
      title: parsed.data.title,
      body: parsed.data.body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', announcementId)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath(`/c/${communitySlug}/events`)

  return { success: true, data: updated }
}

// Delete an announcement (coach or admin only)
export async function deleteAnnouncement(
  communityId: string,
  communitySlug: string,
  announcementId: string
): Promise<AnnouncementActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const membership = await getUserRole(supabase, communityId)
  if (!membership) return { success: false, error: 'Not a member of this community' }
  if (membership.role !== 'coach' && membership.role !== 'admin') {
    return { success: false, error: 'Only coaches and admins can delete announcements' }
  }

  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/c/${communitySlug}/events`)

  return { success: true }
}
