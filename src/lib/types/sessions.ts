// Matches session_templates table
export interface SessionTemplate {
  id: string
  community_id: string
  coach_id: string
  title: string
  venue: string
  capacity: number
  day_of_week: number // 0=Sun, 6=Sat
  start_time: string // HH:MM format
  duration_minutes: number
  starts_on: string // YYYY-MM-DD
  ends_on: string | null
  is_active: boolean
  created_at: string
}

// Matches sessions table
export interface Session {
  id: string
  community_id: string
  template_id: string | null
  venue: string
  capacity: number
  scheduled_at: string // ISO 8601 timestamptz
  duration_minutes: number
  cancelled_at: string | null
  cancellation_reason: string | null
  court_number: string | null
  created_at: string
}

// Matches session_rsvps table
export interface SessionRsvp {
  id: string
  community_id: string
  session_id: string
  member_id: string
  rsvp_type: 'confirmed' | 'waitlisted'
  waitlist_position: number | null
  cancelled_at: string | null
  created_at: string
}

// Matches session_coaches junction table
export interface SessionCoach {
  session_id: string
  member_id: string
  is_primary: boolean
}

// Matches session_invitations table
export interface SessionInvitation {
  id: string
  template_id: string
  member_id: string
  created_at: string
}

// Enriched session for client display (D-09)
export interface SessionWithDetails extends Session {
  template?: SessionTemplate
  rsvps: SessionRsvp[]
  coaches: (SessionCoach & { member_name: string })[]
  confirmed_count: number
  waitlist_count: number
  user_rsvp?: SessionRsvp | null
}

// Supabase join result types (for eliminating `any` casts in page components)

/** Session with joined template title — returned by `.select('..., session_templates(title)')`.
 *  Supabase SDK can't infer the join shape, so we use Record to accept the raw result
 *  and cast at the query boundary. */
export interface SessionWithTemplate {
  id: string
  scheduled_at: string
  duration_minutes: number
  venue: string
  capacity: number
  cancelled_at?: string | null
  court_number?: string | null
  session_templates?: { title: string } | null
  // Allow additional fields from `select('*')` or `select('id, ...')`
  [key: string]: unknown
}

/** RSVP attendee with joined member info.
 *  Supabase returns the FK join as an object at runtime (single row), but SDK types it as array. */
export interface RsvpWithMember {
  session_id: string
  rsvp_type: string
  member?: { display_name: string | null; user_id: string } | null
  [key: string]: unknown
}

// Server action return types
export interface SessionActionResult {
  success: boolean
  error?: string
  fieldErrors?: Record<string, string[]>
}

export interface RsvpActionResult {
  success: boolean
  rsvpType?: 'confirmed' | 'waitlisted'
  waitlistPosition?: number
  error?: string
}
