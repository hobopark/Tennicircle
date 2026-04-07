// @vitest-environment node
import { describe, it, expect } from 'vitest'

describe('Profile Server Actions', () => {
  describe('upsertProfile', () => {
    it.todo('saves profile with name, contact, avatar_url, bio (PROF-01)')
    it.todo('syncs display_name to community_members after save')
    it.todo('rejects unauthenticated users')
    it.todo('validates input with ProfileSchema')
    it.todo('handles upsert on duplicate (user returns to wizard)')
  })

  describe('setCoachAssessment', () => {
    it.todo('saves coach assessment for a player (PROF-02)')
    it.todo('rejects non-coach/admin users (PROF-02)')
    it.todo('upserts on duplicate coach-player-community')
    it.todo('rejects unauthenticated users')
  })

  describe('getLessonHistory', () => {
    it.todo('returns confirmed non-cancelled RSVPs in reverse chronological order (PROF-03)')
    it.todo('includes coach names for each session (PROF-03)')
    it.todo('returns summary stats: total sessions, unique coaches, member since (PROF-03)')
    it.todo('excludes cancelled RSVPs from results')
    it.todo('respects pagination limit and offset')
  })

  describe('addProgressNote', () => {
    it.todo('saves progress note for a session attendee (PROF-04)')
    it.todo('rejects non-coach/admin users (PROF-04)')
    it.todo('upserts on duplicate session-player-coach')
    it.todo('rejects unauthenticated users')
    it.todo('validates note_text is non-empty and under 2000 chars')
  })
})
