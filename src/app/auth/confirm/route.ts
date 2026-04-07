import { createClient } from '@/lib/supabase/server'
import { processInviteSignup } from '@/lib/actions/members'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const inviteToken = searchParams.get('invite')

  if (token_hash && type === 'email') {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type: 'email', token_hash })

    if (!error) {
      // Get the verified user
      const { data: { user } } = await supabase.auth.getUser()

      // Process invite token if present (D-06, D-07)
      if (inviteToken && user) {
        await processInviteSignup(user.id, inviteToken)
        // Force token refresh so the new role appears in JWT immediately
        // Note: This happens server-side; the client will get fresh claims on next navigation
      }

      return NextResponse.redirect(new URL('/welcome', request.url))
    }
  }

  // Invalid or expired verification link
  return NextResponse.redirect(new URL('/auth?error=invalid_link', request.url))
}
