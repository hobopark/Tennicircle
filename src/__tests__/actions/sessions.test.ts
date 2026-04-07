// @vitest-environment node
import { describe, it, expect } from 'vitest'

describe('Session Server Actions', () => {
  describe('createSessionTemplate', () => {
    it.todo('creates a template with valid input (SESS-01)')
    it.todo('rejects non-coach users')
    it.todo('validates required fields via SessionTemplateSchema')
    it.todo('calls generate_sessions_from_templates after insert (SESS-02)')
    it.todo('inserts co-coaches into session_coaches (SESS-04)')
  })

  describe('editSession', () => {
    it.todo('updates single session when scope is "this" (SESS-03)')
    it.todo('updates template and future sessions when scope is "future" (SESS-03)')
    it.todo('does not update past sessions on "future" scope')
    it.todo('rejects non-coach users')
  })

  describe('cancelSession', () => {
    it.todo('sets cancelled_at and cancellation_reason (D-17)')
    it.todo('validates cancellation_reason is non-empty')
    it.todo('rejects non-coach users')
  })
})
