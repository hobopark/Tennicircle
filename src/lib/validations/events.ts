import { z } from 'zod'

export const CreateEventSchema = z.object({
  event_type: z.enum(['tournament', 'social', 'open_session'], {
    error: 'Please select an event type',
  }),
  title: z.string().min(1, { error: 'Title is required' }).max(100, { error: 'Title must be under 100 characters' }),
  description: z.string().max(1000, { error: 'Description must be under 1000 characters' }).optional().or(z.literal('')),
  venue: z.string().min(1, { error: 'Venue is required' }).max(200, { error: 'Venue must be under 200 characters' }),
  starts_at_date: z.string().min(1, { error: 'Date is required' }).refine(
    (val) => {
      // Compare date strings directly (YYYY-MM-DD) to avoid timezone issues
      // Get today's date in Sydney timezone for server-safe comparison
      const sydneyToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
      return val >= sydneyToday
    },
    { error: 'Event date cannot be in the past' }
  ),
  starts_at_time: z.string().min(1, { error: 'Start time is required' }),
  duration_minutes: z.preprocess(
    (v) => (v === '' || v === undefined || v === null ? undefined : Number(v)),
    z.number().int().min(15, { error: 'Duration must be at least 15 minutes' }).max(720, { error: 'Duration must be under 12 hours' }).optional()
  ),
  capacity: z.preprocess(
    (v) => (v === '' || v === undefined || v === null || v === '0' || v === 0 ? undefined : Number(v)),
    z.number().int().min(1, { error: 'Capacity must be at least 1' }).max(500, { error: 'Capacity must be under 500' }).optional()
  ),
})

export const CreateAnnouncementSchema = z.object({
  title: z.string().min(1, { error: 'Title is required' }).max(80, { error: 'Title must be under 80 characters' }),
  body: z.string().min(1, { error: 'Announcement body is required' }).max(400, { error: 'Announcement must be under 400 characters' }),
})

export type CreateEventInput = z.infer<typeof CreateEventSchema>
export type CreateAnnouncementInput = z.infer<typeof CreateAnnouncementSchema>
