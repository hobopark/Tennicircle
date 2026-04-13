import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
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

// Cached per-request: deduplicates getUser() calls across layout + page within a single render.
// Uses zero arguments so React.cache() always matches within the same request.
// Creates its own client internally — cookies() is request-scoped so all clients share state.
export const getCachedUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

// Cached per-request: deduplicates community-by-slug lookups across layout + page.
// Only argument is slug (string), so React.cache() compares by value correctly.
export const getCachedCommunityBySlug = cache(async (slug: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('communities')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()
  return data
})

// D-12: Permission checks query community_members for the user's role in a given community.
// Replaces getJWTClaims() role checks from Phase 1.
export async function getUserRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  communityId: string
): Promise<{ role: 'admin' | 'coach' | 'client'; memberId: string } | null> {
  const user = await getCachedUser()
  if (!user) return null
  const { data } = await supabase
    .from('community_members')
    .select('id, role')
    .eq('user_id', user.id)
    .eq('community_id', communityId)
    .maybeSingle()
  if (!data) return null
  return { role: data.role as 'admin' | 'coach' | 'client', memberId: data.id }
}

// Service role client for operations that bypass RLS (e.g. notification inserts, profile copy on join approve)
// Uses SUPABASE_SERVICE_ROLE_KEY — never expose this to the browser.
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
