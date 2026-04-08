'use server'

import { revalidatePath } from 'next/cache'
import { createClient, getJWTClaims } from '@/lib/supabase/server'
import type { SessionActionResult } from '@/lib/types/sessions'

export async function addInvitation(templateId: string, memberId: string): Promise<SessionActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const claims = await getJWTClaims(supabase)
  if (claims.user_role !== 'coach' && claims.user_role !== 'admin') {
    return { success: false, error: 'Only coaches can manage invitations' }
  }

  const { error } = await supabase
    .from('session_invitations')
    .insert({ template_id: templateId, member_id: memberId })

  if (error) {
    if (error.message.includes('duplicate') || error.message.includes('unique')) {
      return { success: false, error: 'Player is already invited' }
    }
    return { success: false, error: error.message }
  }

  revalidatePath('/coach')
  revalidatePath('/sessions')

  return { success: true }
}

export async function removeInvitation(templateId: string, memberId: string): Promise<SessionActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const claims = await getJWTClaims(supabase)
  if (claims.user_role !== 'coach' && claims.user_role !== 'admin') {
    return { success: false, error: 'Only coaches can manage invitations' }
  }

  const { error } = await supabase
    .from('session_invitations')
    .delete()
    .eq('template_id', templateId)
    .eq('member_id', memberId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/coach')
  revalidatePath('/sessions')

  return { success: true }
}
