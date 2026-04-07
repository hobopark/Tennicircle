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

// Enriched session for client display (D-09)
export interface SessionWithDetails extends Session {
  template?: SessionTemplate
  rsvps: SessionRsvp[]
  coaches: (SessionCoach & { member_name: string })[]
  confirmed_count: number
  waitlist_count: number
  user_rsvp?: SessionRsvp | null
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
