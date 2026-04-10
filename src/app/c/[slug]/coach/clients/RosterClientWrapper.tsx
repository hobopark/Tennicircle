'use client'

import { useState } from 'react'
import { useCommunity } from '@/lib/context/community'
import { PendingRequestsSection } from '@/components/communities/PendingRequestsSection'
import { RosterToggle } from '@/components/members/RosterToggle'
import { MemberCard } from '@/components/members/MemberCard'
import type { MemberCardData } from '@/components/members/MemberCard'

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
  allMembers: MemberCardData[]
  currentMemberId: string
}

export function RosterClientWrapper({
  pendingRequests,
  communitySlug,
  allMembers,
  currentMemberId,
}: RosterClientWrapperProps) {
  const { role } = useCommunity()
  const [view, setView] = useState<'my-clients' | 'all-members'>('my-clients')

  const filteredMembers = view === 'my-clients'
    ? allMembers.filter(m => m.isAssignedToMe && m.role === 'client')
    : allMembers

  const showToggle = role === 'coach' || role === 'admin'

  return (
    <>
      {(role === 'admin' || role === 'coach') && pendingRequests.length > 0 && (
        <PendingRequestsSection
          requests={pendingRequests}
          communitySlug={communitySlug}
        />
      )}

      {showToggle && (
        <div className="mb-4">
          <RosterToggle value={view} onChange={setView} />
        </div>
      )}

      {filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">
            {view === 'my-clients'
              ? 'No clients assigned to you yet. Switch to "All members" to assign clients.'
              : 'No members in this community yet.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filteredMembers.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              viewerRole={role}
              isSelf={member.id === currentMemberId}
            />
          ))}
        </div>
      )}
    </>
  )
}
