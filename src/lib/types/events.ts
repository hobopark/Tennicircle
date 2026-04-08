export type EventType = 'tournament' | 'social' | 'open_session'

export interface Event {
  id: string
  community_id: string
  created_by: string
  event_type: EventType
  title: string
  description: string | null
  venue: string
  starts_at: string
  duration_minutes: number | null
  capacity: number | null
  is_official: boolean
  draw_image_url: string | null
  cancelled_at: string | null
  created_at: string
}

export interface EventWithCreator extends Event {
  creator: {
    display_name: string | null
    avatar_url?: string | null
  } | null
}

export interface EventWithRsvpStatus extends EventWithCreator {
  rsvp_count: number
  user_rsvp: EventRsvp | null
}

export interface EventRsvp {
  id: string
  community_id: string
  event_id: string
  member_id: string
  rsvp_type: 'confirmed' | 'waitlisted'
  waitlist_position: number | null
  cancelled_at: string | null
  created_at: string
}

export interface EventRsvpWithMember extends EventRsvp {
  member: {
    display_name: string | null
    avatar_url: string | null
  }
}

export interface Announcement {
  id: string
  community_id: string
  created_by: string
  title: string
  body: string
  created_at: string
  updated_at: string
}

export interface AnnouncementWithAuthor extends Announcement {
  author: {
    display_name: string | null
    avatar_url?: string | null
    user_id?: string
  } | null
}

/** Raw announcement from Supabase join: `.select('*, author:community_members!created_by(display_name, user_id)')` */
export interface RawAnnouncementRow extends Announcement {
  author: { display_name: string | null; user_id: string } | null
}

/** Raw event from Supabase join: `.select('*, creator:community_members!created_by(display_name)')` */
export interface RawEventRow extends Event {
  creator: { display_name: string | null } | null
}

export interface EventActionResult {
  success: boolean
  data?: Event
  error?: string
  fieldErrors?: Record<string, string[]>
}

export interface EventRsvpActionResult {
  success: boolean
  rsvpType?: 'confirmed' | 'waitlisted'
  error?: string
}

export interface AnnouncementActionResult {
  success: boolean
  data?: Announcement
  error?: string
  fieldErrors?: Record<string, string[]>
}

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  tournament: 'Tournament',
  social: 'Social Event',
  open_session: 'Open Session',
} as const
