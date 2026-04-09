import { describe, it } from 'vitest'

describe('communities actions', () => {
  it.todo('createCommunity returns community with auto-generated slug')
  it.todo('createCommunity handles slug collision')
  it.todo('requestToJoin creates pending request')
  it.todo('requestToJoin rejects duplicate pending request')
  it.todo('approveJoinRequest creates community_members row')
  it.todo('rejectJoinRequest updates status to rejected')
  it.todo('cancelJoinRequest deletes own pending request')
  it.todo('getBrowseCommunities excludes joined and pending communities')
})
