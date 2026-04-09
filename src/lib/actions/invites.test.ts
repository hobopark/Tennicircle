import { describe, it } from 'vitest'

describe('createInviteLink', () => {
  it.todo('creates client invite link when user is coach (MGMT-01)')
  it.todo('creates coach invite link when user is admin (MGMT-01)')
  it.todo('rejects coach invite creation by non-admin coach (MGMT-01)')
  it.todo('rejects invite creation by client role')
  it.todo('returns error when user is not authenticated')
})

describe('revokeInviteLink', () => {
  it.todo('revokes an active invite link')
  it.todo('rejects revocation by non-creator')
})
