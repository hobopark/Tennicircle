'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { CancelSessionSchema } from '@/lib/validations/sessions'
import type { SessionActionResult } from '@/lib/types/sessions'

// createSessionTemplate — added in Plan 03
// editSession — added in Plan 03

// D-17: Coaches and admins can cancel a session with a required reason
export async function cancelSession(
  sessionId: string,
  formData: FormData
): Promise<SessionActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  // Auth check: only coach or admin
  const userRole = user.app_metadata?.user_role
  if (userRole !== 'coach' && userRole !== 'admin') {
    return { success: false, error: 'Only coaches and admins can cancel sessions' }
  }

  // Validate cancellation reason
  const parsed = CancelSessionSchema.safeParse({
    cancellation_reason: formData.get('cancellation_reason'),
  })

  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors }
  }

  const { error } = await supabase
    .from('sessions')
    .update({
      cancelled_at: new Date().toISOString(),
      cancellation_reason: parsed.data.cancellation_reason,
    })
    .eq('id', sessionId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/sessions')
  revalidatePath('/coach')

  return { success: true }
}
