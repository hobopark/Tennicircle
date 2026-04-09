import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

// Extract custom JWT claims (user_role, community_id) injected by Custom Access Token Hook.
// getUser() returns app_metadata from the auth server which does NOT include hook-injected claims.
// The claims are only in the JWT access token, so we decode them from getSession().
export async function getJWTClaims(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return { user_role: undefined, community_id: undefined }
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1]))
    return {
      user_role: payload.user_role as string | undefined,
      community_id: payload.community_id as string | undefined,
    }
  } catch {
    return { user_role: undefined, community_id: undefined }
  }
}
