import { createClient } from '@/lib/supabase/server'
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
      // Invite token processing is handled in Plan 04
      // For now, redirect to welcome per D-11
      const redirectUrl = new URL('/welcome', request.url)
      if (inviteToken) {
        redirectUrl.searchParams.set('invite', inviteToken)
      }
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Invalid or expired verification link
  return NextResponse.redirect(new URL('/auth?error=invalid_link', request.url))
}
