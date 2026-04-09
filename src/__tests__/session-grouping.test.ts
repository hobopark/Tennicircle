import { describe, it, expect } from 'vitest'

// Per D-11: Sessions split into "Today" and "This Week" sections.
// isTodaySydney will be implemented in src/lib/utils/timezone.ts

// Inline stub of the function for testing the logic contract
function isTodaySydney(isoString: string): boolean {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat('en-AU', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d)
  return fmt(new Date(isoString)) === fmt(new Date())
}

describe('Session grouping — Today vs This Week (D-11)', () => {
  it('identifies a session scheduled now as today', () => {
    const now = new Date().toISOString()
    expect(isTodaySydney(now)).toBe(true)
  })

  it('identifies a session scheduled tomorrow as not today', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(12, 0, 0, 0) // midday to avoid edge cases
    expect(isTodaySydney(tomorrow.toISOString())).toBe(false)
  })

  it('splits sessions into today and this-week arrays', () => {
    const now = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(12, 0, 0, 0)

    const sessions = [
      { id: '1', scheduled_at: now.toISOString() },
      { id: '2', scheduled_at: tomorrow.toISOString() },
      { id: '3', scheduled_at: now.toISOString() },
    ]

    const todaySessions = sessions.filter(s => isTodaySydney(s.scheduled_at))
    const thisWeekSessions = sessions.filter(s => !isTodaySydney(s.scheduled_at))

    expect(todaySessions).toHaveLength(2)
    expect(thisWeekSessions).toHaveLength(1)
    expect(todaySessions.map(s => s.id)).toEqual(['1', '3'])
    expect(thisWeekSessions.map(s => s.id)).toEqual(['2'])
  })
})
