import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock @supabase/ssr before importing middleware
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
}))

import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

const mockCreateServerClient = vi.mocked(createServerClient)

function createMockSupabaseWithUser(user: Record<string, unknown> | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
    cookies: {
      getAll: vi.fn().mockReturnValue([]),
      setAll: vi.fn(),
    },
  }
}

function makeRequest(path: string) {
  return new NextRequest(`http://localhost:3000${path}`)
}

describe('updateSession middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects unauthenticated request to /auth with redirectTo param', async () => {
    mockCreateServerClient.mockReturnValue(
      createMockSupabaseWithUser(null) as ReturnType<typeof createMockSupabaseWithUser> as never
    )

    const request = makeRequest('/welcome')
    const response = await updateSession(request)

    expect(response.status).toBe(307)
    const location = response.headers.get('location')
    expect(location).toContain('/auth')
    expect(location).toContain('redirectTo=%2Fwelcome')
  })

  it('redirects authenticated user from /auth to /welcome', async () => {
    mockCreateServerClient.mockReturnValue(
      createMockSupabaseWithUser({
        id: 'user-1',
        email: 'user@example.com',
        email_confirmed_at: '2026-01-01T00:00:00Z',
        app_metadata: { user_role: 'pending' },
      }) as ReturnType<typeof createMockSupabaseWithUser> as never
    )

    const request = makeRequest('/auth')
    const response = await updateSession(request)

    expect(response.status).toBe(307)
    const location = response.headers.get('location')
    expect(location).toContain('/welcome')
  })

  it('redirects coach accessing /admin to /coach (D-13)', async () => {
    mockCreateServerClient.mockReturnValue(
      createMockSupabaseWithUser({
        id: 'user-2',
        email: 'coach@example.com',
        email_confirmed_at: '2026-01-01T00:00:00Z',
        app_metadata: { user_role: 'coach' },
      }) as ReturnType<typeof createMockSupabaseWithUser> as never
    )

    const request = makeRequest('/admin')
    const response = await updateSession(request)

    expect(response.status).toBe(307)
    const location = response.headers.get('location')
    expect(location).toContain('/coach')
  })

  it('allows admin to access /admin', async () => {
    mockCreateServerClient.mockReturnValue(
      createMockSupabaseWithUser({
        id: 'user-3',
        email: 'admin@example.com',
        email_confirmed_at: '2026-01-01T00:00:00Z',
        app_metadata: { user_role: 'admin' },
      }) as ReturnType<typeof createMockSupabaseWithUser> as never
    )

    const request = makeRequest('/admin')
    const response = await updateSession(request)

    // Should pass through (not redirect)
    expect(response.status).not.toBe(307)
  })

  it('redirects pending user accessing /coach to /welcome', async () => {
    mockCreateServerClient.mockReturnValue(
      createMockSupabaseWithUser({
        id: 'user-4',
        email: 'pending@example.com',
        email_confirmed_at: '2026-01-01T00:00:00Z',
        app_metadata: { user_role: 'pending' },
      }) as ReturnType<typeof createMockSupabaseWithUser> as never
    )

    const request = makeRequest('/coach')
    const response = await updateSession(request)

    expect(response.status).toBe(307)
    const location = response.headers.get('location')
    expect(location).toContain('/welcome')
  })
})
