// Notification type discriminator — matches DB check constraint
export type NotificationType =
  | 'session_reminder'
  | 'announcement'
  | 'rsvp_confirmed'
  | 'waitlist_promoted'

// Metadata shapes per notification type
export type NotificationMetadata =
  | { session_id: string; scheduled_at: string }                          // session_reminder
  | { announcement_id: string }                                            // announcement
  | { resource_type: 'session' | 'event'; resource_id: string }          // rsvp_confirmed, waitlist_promoted

// Database row shape
export interface NotificationRow {
  id: string
  community_id: string
  member_id: string
  notification_type: NotificationType
  title: string
  body: string
  metadata: NotificationMetadata
  read_at: string | null
  created_at: string
}

// Action result type (matches project pattern from events.ts / sessions.ts)
export interface NotificationActionResult {
  success: boolean
  error?: string
}
