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

  // Role-based route protection (D-13)
  if (user) {
    // Get role from JWT claims (Custom Access Token Hook injects user_role)
    const { data: { session } } = await supabase.auth.getSession()
    let userRole: string | undefined
    if (session?.access_token) {
      try {
        const payload = JSON.parse(atob(session.access_token.split('.')[1]))
        userRole = payload.user_role
      } catch { /* fall through */ }
    }
    // Fallback to app_metadata
    if (!userRole) {
      userRole = user.app_metadata?.user_role as string | undefined
    }

    // Role-route mapping per D-10
    const roleRoutes: Record<string, string[]> = {
      admin: ['/admin', '/coach', '/sessions', '/welcome', '/profile', '/events'],
      coach: ['/coach', '/welcome', '/profile', '/events'],
      client: ['/sessions', '/welcome', '/profile', '/events'],
    }

    const roleHome: Record<string, string> = {
      admin: '/admin',
      coach: '/coach',
      client: '/sessions',
      pending: '/welcome',
    }

    const currentPath = request.nextUrl.pathname
    const currentRole = userRole || 'pending'

    // Pending users always go to /welcome
    if (currentRole === 'pending' && currentPath !== '/welcome') {
      return NextResponse.redirect(new URL('/welcome', request.url))
    }

    // Non-pending users on /welcome get redirected to their role home
    if (currentRole !== 'pending' && currentPath === '/welcome') {
      const home = roleHome[currentRole] || '/welcome'
      return NextResponse.redirect(new URL(home, request.url))
    }

    // Check if user's role can access current path
    if (currentRole !== 'pending') {
      const allowedPaths = roleRoutes[currentRole] || ['/welcome']
      const canAccess = allowedPaths.some(path => currentPath.startsWith(path))

      // If accessing a restricted path, silently redirect to role home (D-13)
      if (!canAccess && !isPublicPath && currentPath !== '/') {
        const home = roleHome[currentRole] || '/welcome'
        return NextResponse.redirect(new URL(home, request.url))
      }
    }
  }

  return supabaseResponse
}
