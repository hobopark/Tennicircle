'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { RosterToggle } from '@/components/members/RosterToggle'
import { MemberCard } from '@/components/members/MemberCard'
import type { MemberCardData } from '@/components/members/MemberCard'
import type { UserRole } from '@/lib/types/auth'

interface RosterClientWrapperProps {
  allMembers: MemberCardData[]
  viewerRole: Exclude<UserRole, 'pending'>
}

export function RosterClientWrapper({ allMembers, viewerRole }: RosterClientWrapperProps) {
  const [viewMode, setViewMode] = useState<'my-clients' | 'all-members'>('my-clients')

  const displayMembers = viewMode === 'my-clients'
    ? allMembers.filter(m => m.isAssignedToMe)
    : allMembers

  return (
    <>
      <div className="mb-4">
        <RosterToggle value={viewMode} onChange={setViewMode} />
      </div>

      {displayMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="w-8 h-8 text-muted mb-3" />
          <p className="font-heading font-bold text-base mb-1">
            {viewMode === 'my-clients' ? 'No clients assigned' : 'No members yet'}
          </p>
          <p className="text-sm text-muted-foreground">
            {viewMode === 'my-clients'
              ? 'Switch to "All members" to find and assign clients.'
              : 'Members will appear here once they join the community.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {displayMembers.map(member => (
            <MemberCard
              key={member.id}
              member={member}
              viewerRole={viewerRole}
              isSelf={false}
            />
          ))}
        </div>
      )}
    </>
  )
}
