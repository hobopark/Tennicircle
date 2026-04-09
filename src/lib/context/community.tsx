'use client'
import { createContext, useContext } from 'react'
import type { UserRole } from '@/lib/types/auth'

interface CommunityContextValue {
  communityId: string
  communitySlug: string
  communityName: string
  membershipId: string
  role: Exclude<UserRole, 'pending'>
}

const CommunityCtx = createContext<CommunityContextValue | null>(null)

export function CommunityProviderWrapper({
  children,
  communityId,
  communitySlug,
  communityName,
  membershipId,
  role,
}: CommunityContextValue & { children: React.ReactNode }) {
  return (
    <CommunityCtx.Provider value={{ communityId, communitySlug, communityName, membershipId, role }}>
      {children}
    </CommunityCtx.Provider>
  )
}

export function useCommunity(): CommunityContextValue {
  const ctx = useContext(CommunityCtx)
  if (!ctx) throw new Error('useCommunity must be used within CommunityProviderWrapper')
  return ctx
}

/**
 * Safe variant that returns null when outside CommunityProvider.
 * Used by AppNav on global routes like /profile where no community context exists.
 */
export function useMaybeCommunity(): CommunityContextValue | null {
  return useContext(CommunityCtx)
}
