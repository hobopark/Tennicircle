import { describe, it } from 'vitest'

describe('WeekCalendarGrid', () => {
  describe('day view (DASH-01)', () => {
    it.todo('renders day view when view state is "day"')
    it.todo('shows date navigation with previous/next day controls')
    it.todo('filters sessions to selected date only')
    it.todo('shows empty state when no sessions for selected day')
  })

  describe('attendance preview (DASH-02)', () => {
    it.todo('shows confirmed/capacity count on session cards')
    it.todo('shows first 5 attendee avatars in strip')
    it.todo('shows overflow pill when more than 5 attendees')
  })

  describe('view toggle persistence', () => {
    it.todo('defaults to week view on initial render')
    it.todo('persists view choice to localStorage')
  })
})
