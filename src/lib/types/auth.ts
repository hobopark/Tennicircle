// User roles per D-09: Admin, Coach, Client
// 'pending' is the state before community membership is assigned
export type UserRole = 'admin' | 'coach' | 'client' | 'pending'

// Matches community_members table schema
export interface CommunityMember {
  id: string
  community_id: string
  user_id: string
  role: Exclude<UserRole, 'pending'>
  coach_id: string | null
  joined_at: string
}

// Matches communities table schema
export interface Community {
  id: string
  name: string
  slug: string
  created_at: string
}

// Matches invite_links table schema
export interface InviteLink {
  id: string
  community_id: string
  created_by: string
  role: 'coach' | 'client'
  token: string
  revoked_at: string | null
  created_at: string
}

// JWT custom claims injected by Custom Access Token Hook
export interface JWTCustomClaims {
  user_role: UserRole
  community_id: string | null
}

// Auth form state for useActionState pattern
export interface AuthFormState {
  errors?: {
    email?: string[]
    password?: string[]
    general?: string[]
  }
  message?: string
  success?: boolean
  values?: {
    email?: string
  }
}

// Role-based route configuration per D-10
export const ROLE_HOME_ROUTES: Record<Exclude<UserRole, 'pending'>, string> = {
  admin: '/admin',
  coach: '/coach',
  client: '/sessions',
} as const

export const ROLE_ALLOWED_ROUTES: Record<Exclude<UserRole, 'pending'>, string[]> = {
  admin: ['/admin', '/coach', '/sessions', '/welcome', '/profile', '/events'],
  coach: ['/coach', '/welcome', '/profile', '/events'],
  client: ['/sessions', '/welcome', '/profile', '/events'],
} as const

// Public routes that don't require authentication
export const PUBLIC_ROUTES = ['/auth', '/'] as const
