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

export const CoachAssessmentSchema = z.object({
  subjectMemberId: z.string().uuid(),
  skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
})

export type CoachAssessmentInput = z.infer<typeof CoachAssessmentSchema>

export const ProgressNoteSchema = z.object({
  sessionId: z.string().uuid(),
  subjectMemberId: z.string().uuid(),
  noteText: z.string().min(1, { error: 'Note cannot be empty' }).max(2000).trim(),
})

export type ProgressNoteInput = z.infer<typeof ProgressNoteSchema>
