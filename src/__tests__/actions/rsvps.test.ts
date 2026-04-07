// @vitest-environment node
import { describe, it, expect } from 'vitest'

describe('RSVP Server Actions', () => {
  describe('rsvpSession', () => {
    it.todo('confirms RSVP when under capacity (SESS-05)')
    it.todo('waitlists RSVP when at capacity (SESS-07)')
    it.todo('returns correct waitlist position (SESS-07)')
    it.todo('rejects RSVP to cancelled session')
    it.todo('rejects unauthenticated users')
  })

  describe('cancelRsvp', () => {
    it.todo('cancels the user own RSVP (SESS-09)')
    it.todo('resequences waitlist positions after cancellation')
    it.todo('rejects unauthenticated users')
  })

  describe('promoteFromWaitlist', () => {
    it.todo('promotes waitlisted to confirmed (SESS-08)')
    it.todo('rejects when session is at capacity')
    it.todo('resequences remaining waitlist positions')
    it.todo('rejects non-coach users')
  })

  describe('removeFromWaitlist', () => {
    it.todo('removes a waitlisted member by coach action')
    it.todo('resequences remaining waitlist positions')
    it.todo('rejects non-coach users')
  })
})
