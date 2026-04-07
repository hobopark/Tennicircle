import { z } from 'zod'

export const SessionTemplateSchema = z.object({
  title: z.string().min(1, { error: 'Session title is required' }),
  venue: z.string().min(1, { error: 'Venue is required' }),
  day_of_week: z.coerce.number().int().min(0).max(6, { error: 'Invalid day of week' }),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, { error: 'Time must be HH:MM' }),
  duration_minutes: z.coerce.number().int().min(15).max(480).default(60),
  capacity: z.coerce.number().int().min(1, { error: 'Capacity must be at least 1' }),
  starts_on: z.string().date({ error: 'Start date is required' }),
  ends_on: z.string().date().optional(),
  court_number: z.string().optional(),
  co_coach_ids: z.array(z.string().uuid()).optional(),
  invited_client_ids: z.array(z.string().min(1)).min(1, { error: 'Select at least one client' }),
})

export const EditSessionSchema = z.object({
  title: z.string().min(1, { error: 'Title is required' }).optional(),
  venue: z.string().min(1, { error: 'Venue is required' }).optional(),
  capacity: z.coerce.number().int().min(1, { error: 'Capacity must be at least 1' }).optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, { error: 'Time must be HH:MM' }).optional(),
  duration_minutes: z.coerce.number().int().min(15).max(480).optional(),
  court_number: z.string().optional(),
})

export const CancelSessionSchema = z.object({
  cancellation_reason: z.string().min(1, { error: 'Please enter a reason for attendees' }),
})

export type SessionTemplateInput = z.infer<typeof SessionTemplateSchema>
export type EditSessionInput = z.infer<typeof EditSessionSchema>
export type CancelSessionInput = z.infer<typeof CancelSessionSchema>
