import { z } from 'zod'

export const ProfileSchema = z.object({
  displayName: z.string().min(1, { error: 'Name is required' }).max(80).trim(),
  phone: z.string().max(20).trim().optional(),
  bio: z.string().max(500).trim().optional(),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  utr: z.number().min(1).max(16.5).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  coachingBio: z.string().max(500).trim().optional().nullable(),
})

export type ProfileInput = z.infer<typeof ProfileSchema>

// Supabase seed data uses zero-padded sequential UUIDs (e.g. 00000000-0000-0000-0000-000000000020)
// which fail Zod 4's strict z.string().uuid() check (requires version nibble 1-8).
// Use a relaxed hex pattern that accepts any 8-4-4-4-12 format.
const uuidLike = z.string().regex(
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
  'Invalid UUID format'
)

export const CoachAssessmentSchema = z.object({
  subjectMemberId: uuidLike,
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
})

export type CoachAssessmentInput = z.infer<typeof CoachAssessmentSchema>

export const ProgressNoteSchema = z.object({
  sessionId: uuidLike,
  subjectMemberId: uuidLike,
  noteText: z.string().min(1, { error: 'Note cannot be empty' }).max(2000).trim(),
})

export type ProgressNoteInput = z.infer<typeof ProgressNoteSchema>
