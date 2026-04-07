import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  getJWTClaims: vi.fn().mockResolvedValue({ user_role: 'admin', community_id: 'community-1' }),
}))

import { updateMemberRole, processInviteSignup, removeMember } from '@/lib/actions/members'
import { createClient, getJWTClaims } from '@/lib/supabase/server'

const mockCreateClient = vi.mocked(createClient)
const mockGetJWTClaims = vi.mocked(getJWTClaims)

function createMockSupabase(overrides: {
  user?: Record<string, unknown> | null
  updateResult?: { error: { message: string } | null }
  deleteResult?: { error: { message: string } | null }
  inviteLookupResult?: { data: Record<string, unknown> | null; error: { message: string } | null }
  insertResult?: { error: { message: string } | null }
} = {}) {
  const updateEqMock = vi.fn().mockResolvedValue(
    overrides.updateResult ?? { error: null }
  )
  const deleteEqMock = vi.fn().mockResolvedValue(
    overrides.deleteResult ?? { error: null }
  )

  const inviteSingleMock = vi.fn().mockResolvedValue(
    overrides.inviteLookupResult ?? {
      data: {
        id: 'invite-1',
        community_id: 'community-1',
        created_by: 'member-coach-1',
        role: 'client',
        token: 'validtoken',
        revoked_at: null,
      },
      error: null,
    }
  )

  const insertMock = vi.fn().mockResolvedValue(
    overrides.insertResult ?? { error: null }
  )

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: 'user' in overrides ? overrides.user : {
            id: 'user-admin',
            app_metadata: { user_role: 'admin', community_id: 'community-1' },
          },
        },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'community_members') {
        return {
          update: vi.fn().mockReturnValue({ eq: updateEqMock }),
          delete: vi.fn().mockReturnValue({ eq: deleteEqMock }),
          insert: vi.fn().mockResolvedValue(overrides.insertResult ?? { error: null }),
        }
      }
      if (table === 'invite_links') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: inviteSingleMock,
        }
      }
      return {}
    }),
  }
}

describe('updateMemberRole', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fails when caller is not admin', async () => {
    const mockSupabase = createMockSupabase({
      user: {
        id: 'user-coach',
        app_metadata: { user_role: 'coach', community_id: 'community-1' },
      },
    })
    mockCreateClient.mockResolvedValue(mockSupabase as never)
    mockGetJWTClaims.mockResolvedValueOnce({ user_role: 'coach', community_id: 'community-1' })

    const result = await updateMemberRole('member-1', 'client')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Only admins can update roles')
  })

  it('succeeds when caller is admin', async () => {
    const mockSupabase = createMockSupabase({
      user: {
        id: 'user-admin',
        app_metadata: { user_role: 'admin', community_id: 'community-1' },
      },
    })
    mockCreateClient.mockResolvedValue(mockSupabase as never)

    const result = await updateMemberRole('member-1', 'coach')

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('fails when unauthenticated', async () => {
    const mockSupabase = createMockSupabase({ user: null })
    mockCreateClient.mockResolvedValue(mockSupabase as never)

    const result = await updateMemberRole('member-1', 'coach')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })
})

describe('processInviteSignup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates community membership with valid token', async () => {
    const mockSupabase = createMockSupabase()
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'invite_links') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'invite-1',
              community_id: 'community-1',
              created_by: 'member-coach-1',
              role: 'client',
              token: 'validtoken',
              revoked_at: null,
            },
            error: null,
          }),
        }
      }
      if (table === 'community_members') {
        return { insert: insertMock }
      }
      return {}
    }) as never
    mockCreateClient.mockResolvedValue(mockSupabase as never)

    const result = await processInviteSignup('user-new', 'validtoken')

    expect(result.success).toBe(true)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        community_id: 'community-1',
        user_id: 'user-new',
        role: 'client',
        coach_id: 'member-coach-1',
      })
    )
  })

  it('returns error for revoked or invalid token', async () => {
    const mockSupabase = createMockSupabase({
      inviteLookupResult: { data: null, error: { message: 'No rows returned' } },
    })
    mockCreateClient.mockResolvedValue(mockSupabase as never)

    const result = await processInviteSignup('user-new', 'revokedtoken')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Invalid or revoked invite link')
  })

  it('sets coach_id to null for coach role invites', async () => {
    const mockSupabase = createMockSupabase()
    const insertMock = vi.fn().mockResolvedValue({ error: null })
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'invite_links') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'invite-2',
              community_id: 'community-1',
              created_by: 'member-admin-1',
              role: 'coach',
              token: 'coachtoken',
              revoked_at: null,
            },
            error: null,
          }),
        }
      }
      if (table === 'community_members') {
        return { insert: insertMock }
      }
      return {}
    }) as never
    mockCreateClient.mockResolvedValue(mockSupabase as never)

    const result = await processInviteSignup('user-new-coach', 'coachtoken')

    expect(result.success).toBe(true)
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'coach',
        coach_id: null,
      })
    )
  })
})

describe('removeMember', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fails when caller is not admin', async () => {
    const mockSupabase = createMockSupabase({
      user: {
        id: 'user-coach',
        app_metadata: { user_role: 'coach', community_id: 'community-1' },
      },
    })
    mockCreateClient.mockResolvedValue(mockSupabase as never)
    mockGetJWTClaims.mockResolvedValueOnce({ user_role: 'coach', community_id: 'community-1' })

    const result = await removeMember('member-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Only admins can remove members')
  })

  it('succeeds when caller is admin', async () => {
    const mockSupabase = createMockSupabase({
      user: {
        id: 'user-admin',
        app_metadata: { user_role: 'admin', community_id: 'community-1' },
      },
    })
    mockCreateClient.mockResolvedValue(mockSupabase as never)

    const result = await removeMember('member-1')

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('fails when unauthenticated', async () => {
    const mockSupabase = createMockSupabase({ user: null })
    mockCreateClient.mockResolvedValue(mockSupabase as never)

    const result = await removeMember('member-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })
})
