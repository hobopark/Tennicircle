'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getJWTClaims } from '@/lib/supabase/server'
import { CreateAnnouncementSchema } from '@/lib/validations/events'
import type { AnnouncementActionResult } from '@/lib/types/events'

// EVNT-02: Coach/admin posts a community announcement
export async function createAnnouncement(
  _prevState: AnnouncementActionResult,
  formData: FormData
): Promise<AnnouncementActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const claims = await getJWTClaims(supabase)
  const communityId = claims.community_id
  if (!communityId) return { success: false, error: 'No community associated with your account' }

  // T-04-05: Role check — only coaches and admins can post announcements
  if (claims.user_role !== 'coach' && claims.user_role !== 'admin') {
    return { success: false, error: 'Only coaches and admins can post announcements' }
  }

  // Get member record
  const { data: member, error: memberError } = await supabase
    .from('community_members')
    .select('id')
    .eq('user_id', user.id)
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

  revalidatePath('/events')

  return { success: true, data: insertedAnnouncement }
}
