'use client'

import { useCommunity } from '@/lib/context/community'
import { PendingRequestsSection } from '@/components/communities/PendingRequestsSection'

interface PendingRequest {
  id: string
  user_id: string
  created_at: string
  display_name: string | null
  avatar_url: string | null
}

interface RosterClientWrapperProps {
  pendingRequests: PendingRequest[]
  communitySlug: string
}

export function RosterClientWrapper({ pendingRequests, communitySlug }: RosterClientWrapperProps) {
  const { role } = useCommunity()

  if (role !== 'admin' && role !== 'coach') return null
  if (pendingRequests.length === 0) return null

  return (
    <PendingRequestsSection
      requests={pendingRequests}
      communitySlug={communitySlug}
    />
  )
}
