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

// Matches communities table schema (D-43: description column added)
export interface Community {
  id: string
  name: string
  slug: string
  description: string | null
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

// Matches coach_client_assignments junction table (Phase 7 D-10)
export interface CoachClientAssignment {
  id: string
  community_id: string
  coach_member_id: string
  client_member_id: string
  assigned_at: string
}

// Matches join_requests table (Phase 8 D-42)
export interface JoinRequest {
  id: string
  community_id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  resolved_at: string | null
  resolved_by: string | null
}

/** @deprecated Use getRoleHomeRoute(slug, role) instead */
// JWT custom claims injected by Custom Access Token Hook — removed in Phase 8 (D-08, D-09, D-10)
// Kept temporarily for backward compatibility during migration. Remove after proxy rewrite in Plan 03.
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

// Dynamic role home route per D-16 — community-scoped routes use slug in path
export function getRoleHomeRoute(slug: string, role: Exclude<UserRole, 'pending'>): string {
  const routes: Record<Exclude<UserRole, 'pending'>, string> = {
    admin: `/c/${slug}/admin`,
    coach: `/c/${slug}/coach`,
    client: `/c/${slug}/sessions`,
  }
  return routes[role]
}

/** @deprecated Use getRoleHomeRoute(slug, role) instead */
// Role-based route configuration per D-10 — flat routes pre-Phase 8
// Will be removed when proxy is rewritten in Plan 03.
export const ROLE_HOME_ROUTES: Record<Exclude<UserRole, 'pending'>, string> = {
  admin: '/admin',
  coach: '/coach',
  client: '/sessions',
} as const

// Path suffix patterns after /c/[slug] — used by proxy for role-based route access checks
export const ROLE_ALLOWED_ROUTE_PATTERNS: Record<Exclude<UserRole, 'pending'>, string[]> = {
  admin: ['/admin', '/coach', '/sessions', '/events', '/notifications', '/members'],
  coach: ['/coach', '/events', '/notifications', '/members'],
  client: ['/sessions', '/events', '/notifications', '/members'],
}

export const ROLE_ALLOWED_ROUTES: Record<Exclude<UserRole, 'pending'>, string[]> = {
  admin: ['/admin', '/coach', '/sessions', '/welcome', '/profile', '/events'],
  coach: ['/coach', '/welcome', '/profile', '/events'],
  client: ['/sessions', '/welcome', '/profile', '/events'],
} as const

// Public routes that don't require authentication
export const PUBLIC_ROUTES = ['/auth', '/'] as const

// Routes accessible to any authenticated user (no community membership required)
export const AUTHENTICATED_PUBLIC_ROUTES = ['/communities', '/profile', '/profile/setup'] as const
