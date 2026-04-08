import { describe, it } from 'vitest'

// These tests will be filled in as implementation proceeds.
// They define the behavioral contracts for event server actions.

describe('createEvent', () => {
  it.todo('creates a tournament event with valid data (EVNT-01)')
  it.todo('creates a social event with capacity (EVNT-02)')
  it.todo('creates an open session event (EVNT-03)')
  it.todo('computes is_official from JWT role, not form data (EVNT-05)')
  it.todo('returns validation errors for missing required fields')
  it.todo('rejects unauthenticated users')
})

describe('rsvpEvent', () => {
  it.todo('inserts confirmed RSVP when capacity available (EVNT-04)')
  it.todo('inserts waitlisted RSVP when event is full')
  it.todo('prevents duplicate RSVP for same event')
  it.todo('rejects RSVP to cancelled event')
})

describe('cancelEventRsvp', () => {
  it.todo('sets cancelled_at on existing RSVP')
  it.todo('is idempotent for already-cancelled RSVP')
})

describe('deleteEvent', () => {
  it.todo('allows creator to delete their event')
  it.todo('allows admin to delete any event')
  it.todo('rejects deletion by non-creator non-admin')
})
