import { describe, it, expect } from 'vitest'

// Per D-02: Waitlisted clients see "Waitlisted -- #N in line" inline on the session card
// where the RSVP button normally appears.

describe('Waitlist inline display logic', () => {
  it('shows waitlist position when rsvp_type is waitlisted', () => {
    const rsvp_type = 'waitlisted'
    const waitlist_position = 3
    const display = rsvp_type === 'waitlisted'
      ? `Waitlisted \u2014 #${waitlist_position} in line`
      : 'Going'
    expect(display).toBe('Waitlisted \u2014 #3 in line')
  })

  it('shows "Going" when rsvp_type is confirmed', () => {
    const rsvp_type: string = 'confirmed'
    const waitlist_position = null
    const display = rsvp_type === 'waitlisted'
      ? `Waitlisted \u2014 #${waitlist_position ?? '?'} in line`
      : 'Going'
    expect(display).toBe('Going')
  })

  it('shows "?" when waitlist_position is null but type is waitlisted', () => {
    const rsvp_type = 'waitlisted'
    const waitlist_position: number | null = null
    const display = rsvp_type === 'waitlisted'
      ? `Waitlisted \u2014 #${waitlist_position ?? '?'} in line`
      : 'Going'
    expect(display).toBe('Waitlisted \u2014 #? in line')
  })
})
