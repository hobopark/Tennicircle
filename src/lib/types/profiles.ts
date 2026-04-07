// Matches player_profiles table
export interface PlayerProfile {
  id: string
  community_id: string
  user_id: string
  display_name: string | null
  phone: string | null
  bio: string | null
  avatar_url: string | null
  self_skill_level: 'beginner' | 'intermediate' | 'advanced' | null
  utr: number | null
  coaching_bio: string | null
  created_at: string
  updated_at: string
}

// Matches coach_assessments table
export interface CoachAssessment {
  id: string
  community_id: string
  subject_member_id: string
  coach_member_id: string
  skill_level: 'beginner' | 'intermediate' | 'advanced'
  assessed_at: string
}

// Matches progress_notes table
export interface ProgressNote {
  id: string
  community_id: string
  session_id: string
  subject_member_id: string
  coach_member_id: string
  note_text: string
  created_at: string
  updated_at: string
}

// Enriched lesson history entry for UI display (D-09)
export interface LessonHistoryEntry {
  rsvp_id: string
  session_id: string
  scheduled_at: string
  venue: string
  duration_minutes: number
  coaches: { member_id: string; display_name: string; is_primary: boolean }[]
  progress_notes: { coach_name: string; note_text: string; created_at: string }[]
}

// Summary stats for lesson history header (D-10)
export interface LessonHistorySummary {
  total_sessions: number
  unique_coaches: number
  member_since: string // ISO date string
}

// Skill level type alias
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

// Server action return type (follows existing SessionActionResult pattern)
export interface ProfileActionResult {
  success: boolean
  error?: string
}
