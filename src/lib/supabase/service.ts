import { createClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with service_role key — bypasses RLS.
 * ONLY use server-side for notification inserts and cron jobs.
 * NEVER import in 'use client' components.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
