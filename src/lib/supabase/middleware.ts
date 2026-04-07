import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: getUser() validates JWT signature — do NOT use getSession() here
  const { data: { user } } = await supabase.auth.getUser()

  // Route protection: unauthenticated users redirected to /auth (D-12)
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
  const isPublicPath = isAuthPage || request.nextUrl.pathname === '/'

  if (!user && !isPublicPath) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth'
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Authenticated user trying to visit /auth — redirect to welcome (D-11, Phase 1)
  if (user && isAuthPage) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/welcome'
    return NextResponse.redirect(redirectUrl)
  }

  // Check email verification (D-04)
  if (user && !user.email_confirmed_at && !isAuthPage) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth'
    redirectUrl.searchParams.set('error', 'email_not_verified')
    return NextResponse.redirect(redirectUrl)
  }

  // Role-based route protection (D-13) — expanded in Plan 04
  // For now: basic auth check is sufficient; role routing added when role pages exist

  return supabaseResponse
}
