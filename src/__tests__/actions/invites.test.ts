import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  getJWTClaims: vi.fn().mockResolvedValue({ user_role: 'coach', community_id: 'community-1' }),
}))

import { createInviteLink, revokeInviteLink } from '@/lib/actions/invites'
import { createClient, getJWTClaims } from '@/lib/supabase/server'

const mockCreateClient = vi.mocked(createClient)
const mockGetJWTClaims = vi.mocked(getJWTClaims)

function createMockSupabase(overrides: {
  user?: Record<string, unknown> | null
  memberResult?: { data: { id: string } | null; error: null }
  insertResult?: { data: unknown; error: { message: string } | null }
  updateResult?: { error: { message: string } | null }
} = {}) {
  const fromChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(
      overrides.memberResult ?? { data: { id: 'member-1' }, error: null }
    ),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
  }

  // For insert chain returning .select().single()
  const insertSelectSingle = vi.fn().mockResolvedValue(
    overrides.insertResult ?? {
      data: {
        id: 'invite-1',
        community_id: 'community-1',
        created_by: 'member-1',
        role: 'client',
        token: 'abc123token',
        revoked_at: null,
        created_at: '2026-01-01T00:00:00Z',
      },
      error: null,
    }
  )

  const insertChain = {
    select: vi.fn().mockReturnValue({ single: insertSelectSingle }),
  }

  const updateChain = {
    eq: vi.fn().mockResolvedValue(
      overrides.updateResult ?? { error: null }
    ),
  }

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: 'user' in overrides ? overrides.user : {
            id: 'user-1',
            app_metadata: { user_role: 'coach', community_id: 'community-1' },
          },
        },
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'community_members') {
        return { ...fromChain }
      }
      if (table === 'invite_links') {
        return {
          insert: vi.fn().mockReturnValue(insertChain),
          update: vi.fn().mockReturnValue(updateChain),
        }
      }
      return fromChain
    }),
  }
}

describe('createInviteLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fails when coach tries to create a coach invite link', async () => {
    const mockSupabase = createMockSupabase({
      user: {
        id: 'user-1',
        app_metadata: { user_role: 'coach', community_id: 'community-1' },
      },
    })
    mockCreateClient.mockResolvedValue(mockSupabase as never)

    const result = await createInviteLink('coach')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Only admins can create coach invite links')
  })

  it('succeeds when coach creates a client invite link', async () => {
    const mockSupabase = createMockSupabase({
      user: {
        id: 'user-1',
        app_metadata: { user_role: 'coach', community_id: 'community-1' },
      },
    })
    mockCreateClient.mockResolvedValue(mockSupabase as never)

    const result = await createInviteLink('client')

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data?.role).toBe('client')
  })

  it('fails when unauthenticated user tries to create invite link', async () => {
    const mockSupabase = createMockSupabase({ user: null })
    mockCreateClient.mockResolvedValue(mockSupabase as never)

    const result = await createInviteLink('client')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })

  it('fails when client tries to create invite link', async () => {
    const mockSupabase = createMockSupabase({
      user: {
        id: 'user-1',
        app_metadata: { user_role: 'client', community_id: 'community-1' },
      },
    })
    mockCreateClient.mockResolvedValue(mockSupabase as never)
    mockGetJWTClaims.mockResolvedValueOnce({ user_role: 'client', community_id: 'community-1' })

    const result = await createInviteLink('client')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Only admins and coaches can create invite links')
  })

  it('admin can create a coach invite link', async () => {
    const mockSupabase = createMockSupabase({
      user: {
        id: 'user-admin',
        app_metadata: { user_role: 'admin', community_id: 'community-1' },
      },
    })
    mockCreateClient.mockResolvedValue(mockSupabase as never)
    mockGetJWTClaims.mockResolvedValueOnce({ user_role: 'admin', community_id: 'community-1' })

    const result = await createInviteLink('coach')

    expect(result.success).toBe(true)
  })
})

describe('revokeInviteLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets revoked_at on a valid invite link', async () => {
    const mockSupabase = createMockSupabase({
      user: {
        id: 'user-1',
        app_metadata: { user_role: 'coach', community_id: 'community-1' },
      },
    })

    // Override from for invite_links revoke
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    const updateMock = vi.fn().mockReturnValue({ eq: eqMock })
    mockSupabase.from = vi.fn((table: string) => {
      if (table === 'invite_links') {
        return { update: updateMock }
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'member-1' }, error: null }) }
    }) as never

    mockCreateClient.mockResolvedValue(mockSupabase as never)

    const result = await revokeInviteLink('invite-1')

    expect(result.success).toBe(true)
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ revoked_at: expect.any(String) })
    )
    expect(eqMock).toHaveBeenCalledWith('id', 'invite-1')
  })

  it('fails when unauthenticated', async () => {
    const mockSupabase = createMockSupabase({ user: null })
    mockCreateClient.mockResolvedValue(mockSupabase as never)

    const result = await revokeInviteLink('invite-1')

    expect(result.success).toBe(false)
    expect(result.error).toBe('Not authenticated')
  })
})
