import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase server client before importing the actions
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock next/navigation redirect
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

import { login, signup } from '@/lib/actions/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const mockCreateClient = vi.mocked(createClient)
const mockRedirect = vi.mocked(redirect)

// Helper to create a mock Supabase client
function createMockSupabase(overrides: {
  signInWithPasswordResult?: { error: { message: string } | null }
  signUpResult?: { data?: unknown; error: { message: string } | null }
} = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue(
        overrides.signInWithPasswordResult ?? { error: null }
      ),
      signUp: vi.fn().mockResolvedValue(
        overrides.signUpResult ?? { data: {}, error: null }
      ),
    },
  }
}

describe('login server action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns field error for invalid email', async () => {
    const formData = new FormData()
    formData.set('email', 'not-an-email')
    formData.set('password', 'password123')

    const result = await login({}, formData)

    expect(result.errors?.email).toBeDefined()
    expect(result.errors?.email?.[0]).toContain('Please enter a valid email address')
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('returns field error for empty password', async () => {
    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('password', '')

    const result = await login({}, formData)

    expect(result.errors?.password).toBeDefined()
    expect(result.errors?.password?.[0]).toContain('Password is required')
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('returns general error for invalid login credentials', async () => {
    const mockSupabase = createMockSupabase({
      signInWithPasswordResult: { error: { message: 'Invalid login credentials' } },
    })
    mockCreateClient.mockResolvedValue(mockSupabase as ReturnType<typeof createMockSupabase> as never)

    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('password', 'wrongpassword')

    const result = await login({}, formData)

    expect(result.errors?.general?.[0]).toBe('Incorrect email or password. Please try again.')
  })

  it('returns general error when email not confirmed', async () => {
    const mockSupabase = createMockSupabase({
      signInWithPasswordResult: { error: { message: 'Email not confirmed' } },
    })
    mockCreateClient.mockResolvedValue(mockSupabase as ReturnType<typeof createMockSupabase> as never)

    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('password', 'password123')

    const result = await login({}, formData)

    expect(result.errors?.general?.[0]).toBe(
      'Please verify your email before logging in. Check your inbox.'
    )
  })

  it('redirects to /welcome on successful login', async () => {
    const mockSupabase = createMockSupabase({ signInWithPasswordResult: { error: null } })
    mockCreateClient.mockResolvedValue(mockSupabase as ReturnType<typeof createMockSupabase> as never)

    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('password', 'password123')

    await login({}, formData)

    expect(mockRedirect).toHaveBeenCalledWith('/welcome')
  })

  it('returns AuthFormState shape', async () => {
    const formData = new FormData()
    formData.set('email', 'bad')
    formData.set('password', '')

    const result = await login({}, formData)

    expect(result).toHaveProperty('errors')
    expect(typeof result).toBe('object')
  })
})

describe('signup server action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns field error for password shorter than 8 chars', async () => {
    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('password', 'short')

    const result = await signup({}, formData)

    expect(result.errors?.password).toBeDefined()
    expect(result.errors?.password?.[0]).toContain('Password must be at least 8 characters')
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it('returns field error for invalid email', async () => {
    const formData = new FormData()
    formData.set('email', 'not-valid')
    formData.set('password', 'password123')

    const result = await signup({}, formData)

    expect(result.errors?.email).toBeDefined()
    expect(result.errors?.email?.[0]).toContain('Please enter a valid email address')
  })

  it('calls supabase.auth.signUp with valid data', async () => {
    const mockSupabase = createMockSupabase({ signUpResult: { data: {}, error: null } })
    mockCreateClient.mockResolvedValue(mockSupabase as ReturnType<typeof createMockSupabase> as never)

    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('password', 'password123')

    const result = await signup({}, formData)

    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'user@example.com',
        password: 'password123',
      })
    )
    expect(result.success).toBe(true)
    expect(result.message).toBe('user@example.com')
  })

  it('returns general error when email already registered', async () => {
    const mockSupabase = createMockSupabase({
      signUpResult: { error: { message: 'User already registered' } },
    })
    mockCreateClient.mockResolvedValue(mockSupabase as ReturnType<typeof createMockSupabase> as never)

    const formData = new FormData()
    formData.set('email', 'existing@example.com')
    formData.set('password', 'password123')

    const result = await signup({}, formData)

    expect(result.errors?.general?.[0]).toBe(
      'An account with this email already exists. Try logging in.'
    )
  })

  it('threads invite_token into emailRedirectTo', async () => {
    const mockSupabase = createMockSupabase({ signUpResult: { data: {}, error: null } })
    mockCreateClient.mockResolvedValue(mockSupabase as ReturnType<typeof createMockSupabase> as never)

    const formData = new FormData()
    formData.set('email', 'user@example.com')
    formData.set('password', 'password123')
    formData.set('invite_token', 'abc123')

    await signup({}, formData)

    const callArg = mockSupabase.auth.signUp.mock.calls[0][0] as { options: { emailRedirectTo: string } }
    expect(callArg.options.emailRedirectTo).toContain('invite=abc123')
  })

  it('returns AuthFormState shape', async () => {
    const formData = new FormData()
    formData.set('email', 'bad')
    formData.set('password', '')

    const result = await signup({}, formData)

    expect(result).toHaveProperty('errors')
    expect(typeof result).toBe('object')
  })
})
