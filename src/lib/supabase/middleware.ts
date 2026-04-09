import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { getRoleHomeRoute, ROLE_ALLOWED_ROUTE_PATTERNS } from '@/lib/types/auth'

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

  // IMPORTANT: getUser() validates JWT signature server-side — do NOT use getSession() here
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Step 1: Not authenticated → public route? PASS, otherwise redirect /auth
  const isPublicPath = pathname === '/' || pathname.startsWith('/auth') || pathname.startsWith('/api/cron')
  if (!user) {
    if (isPublicPath) return supabaseResponse
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Step 2: Email not verified → allow /auth, redirect everything else
  // (MUST come before /auth redirect to avoid infinite loop: unverified user
  //  on /auth → redirect /communities → email check → redirect /auth → loop)
  if (!user.email_confirmed_at) {
    if (pathname.startsWith('/auth')) return supabaseResponse
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.searchParams.set('error', 'email_not_verified')
    return NextResponse.redirect(url)
  }

  // Step 3: Authenticated + verified + on /auth → redirect /communities
  if (pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/communities'
    return NextResponse.redirect(url)
  }

  // Combined query: profile + all memberships (D-13)
  // TWO separate queries because a user without memberships still needs profile check.
  // If profile query is anchored to community_members via join, users with 0 memberships
  // won't get their profile data.
  const { data: profile } = await supabase
    .from('player_profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const { data: memberships } = await supabase
    .from('community_members')
    .select('id, role, community_id, communities!inner(id, name, slug)')
    .eq('user_id', user.id)

  // Step 4: No profile → on /profile/setup? PASS, otherwise redirect /profile/setup
  // (D-15: Profile setup happens BEFORE community selection. This works because
  // player_profiles.community_id is nullable — initial setup creates a global profile
  // with community_id = NULL. The self-read RLS policy ensures this query returns
  // the user's own profile regardless of community membership status.)
  if (!profile) {
    if (pathname.startsWith('/profile/setup')) return supabaseResponse
    const url = request.nextUrl.clone()
    url.pathname = '/profile/setup'
    return NextResponse.redirect(url)
  }

  // Step 5: On /communities → PASS (always allowed for authenticated users with profile)
  if (pathname === '/communities') return supabaseResponse

  // Step 6: On old flat route → redirect based on community count (D-06)
  const oldFlatRoutes = ['/coach', '/sessions', '/admin', '/events', '/notifications', '/welcome']
  const matchedOldRoute = oldFlatRoutes.find(r => pathname === r || pathname.startsWith(r + '/'))
  if (matchedOldRoute) {
    const url = request.nextUrl.clone()
    if (memberships && memberships.length === 1) {
      const m = memberships[0]
      const slug = (m.communities as unknown as { slug: string }).slug
      // Preserve full nested path: /sessions/123 → /c/{slug}/sessions/123
      if (matchedOldRoute === '/welcome') {
        url.pathname = getRoleHomeRoute(slug, m.role as 'admin' | 'coach' | 'client')
      } else {
        url.pathname = `/c/${slug}${pathname}` // Use full pathname, not just matched route
      }
    } else {
      url.pathname = '/communities'
    }
    return NextResponse.redirect(url)
  }

  // Step 7: On /c/[slug]/* → check membership and role access
  const slugMatch = pathname.match(/^\/c\/([^/]+)(.*)$/)
  if (slugMatch) {
    const slug = slugMatch[1]
    const subPath = slugMatch[2] || ''

    // Find membership for this community
    const membership = memberships?.find(
      (m) => (m.communities as unknown as { slug: string }).slug === slug
    )

    // Not a member → redirect /communities (D-50)
    if (!membership) {
      const url = request.nextUrl.clone()
      url.pathname = '/communities'
      return NextResponse.redirect(url)
    }

    // Check role access (D-17)
    const role = membership.role as 'admin' | 'coach' | 'client'

    // Bare /c/[slug]/ with no sub-path → redirect to role home (no page.tsx exists here)
    if (subPath === '' || subPath === '/') {
      const url = request.nextUrl.clone()
      url.pathname = getRoleHomeRoute(slug, role)
      return NextResponse.redirect(url)
    }

    const allowedPatterns = ROLE_ALLOWED_ROUTE_PATTERNS[role]
    const isAllowed = allowedPatterns.some(
      pattern => subPath === pattern || subPath.startsWith(pattern + '/')
    )

    if (!isAllowed) {
      // Redirect to role home for this community
      const url = request.nextUrl.clone()
      url.pathname = getRoleHomeRoute(slug, role)
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  // Step 8: On /profile or /profile/setup → PASS (global routes, D-04)
  if (pathname.startsWith('/profile')) return supabaseResponse

  // Step 8: On /api/* → PASS (API routes)
  if (pathname.startsWith('/api')) return supabaseResponse

  // Everything else → PASS
  return supabaseResponse
}
