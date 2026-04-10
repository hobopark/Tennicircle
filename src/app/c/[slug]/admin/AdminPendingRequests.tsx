'use client'

import { PendingRequestsSection } from '@/components/communities/PendingRequestsSection'

interface PendingRequest {
  id: string
  user_id: string
  created_at: string
  display_name: string | null
  avatar_url: string | null
}

interface Props {
  requests: PendingRequest[]
  communitySlug: string
}

export function AdminPendingRequests({ requests, communitySlug }: Props) {
  return (
    <div className="mb-6">
      <PendingRequestsSection requests={requests} communitySlug={communitySlug} />
    </div>
  )
}
