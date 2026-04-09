'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { CommunityCard } from '@/components/communities/CommunityCard'
import { CommunityBrowseCard } from '@/components/communities/CommunityBrowseCard'
import { CreateCommunityDialog } from '@/components/communities/CreateCommunityDialog'
import type { UserRole } from '@/lib/types/auth'

interface MyCommunity {
  community: {
    id: string
    name: string
    slug: string
    description: string | null
  }
  role: Exclude<UserRole, 'pending'>
  memberId: string
  memberCount: number
}

interface PendingCommunity {
  id: string
  name: string
  description: string | null
  memberCount: number
  requestId: string
}

interface BrowseCommunity {
  id: string
  name: string
  slug: string
  description: string | null
  member_count: number
}

interface CommunitiesPageClientProps {
  myCommunities: MyCommunity[]
  pendingCommunities: PendingCommunity[]
  browseCommunities: BrowseCommunity[]
  isAdmin: boolean
}

export function CommunitiesPageClient({
  myCommunities,
  pendingCommunities,
  browseCommunities,
  isAdmin,
}: CommunitiesPageClientProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const hasAnything =
    myCommunities.length > 0 ||
    isAdmin ||
    pendingCommunities.length > 0 ||
    browseCommunities.length > 0

  return (
    <div className="px-5 pt-16 pb-24">
      <h1 className="font-heading font-bold text-2xl mb-6">Communities</h1>

      {/* Empty state: no communities at all */}
      {!hasAnything && (
        <div role="status" className="flex flex-col gap-2 py-8 text-center">
          <p className="font-heading font-bold text-base">No communities yet</p>
          <p className="text-sm text-muted-foreground">
            Browse available communities below to request access, or ask your coach for an invite link.
          </p>
        </div>
      )}

      {/* Section 1: Your Communities */}
      {(myCommunities.length > 0 || isAdmin) && (
        <section className="mb-8">
          <h2 className="font-heading font-bold text-base mb-3">Your Communities</h2>
          <div className="grid grid-cols-1 gap-4">
            {myCommunities.map((item) => (
              <CommunityCard
                key={item.community.id}
                community={{
                  id: item.community.id,
                  name: item.community.name,
                  slug: item.community.slug,
                  description: item.community.description,
                  memberCount: item.memberCount,
                }}
                role={item.role}
              />
            ))}

            {/* Admin: Create Community card */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => setCreateDialogOpen(true)}
                className="border-2 border-dashed border-border rounded-3xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer min-h-[120px] hover:border-primary/50 hover:bg-muted/30 transition-colors"
                aria-label="Create a new community"
              >
                <Plus className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Create Community</span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Section 2: Pending */}
      {pendingCommunities.length > 0 && (
        <section className="mb-8">
          <h2 className="font-heading font-bold text-base mb-3 flex items-center gap-2">
            Pending
            <span
              className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full"
              aria-label={`${pendingCommunities.length} pending join request${pendingCommunities.length !== 1 ? 's' : ''}`}
            >
              {pendingCommunities.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {pendingCommunities.map((item) => (
              <CommunityBrowseCard
                key={item.id}
                community={{
                  id: item.id,
                  name: item.name,
                  description: item.description,
                  memberCount: item.memberCount,
                }}
                pendingRequestId={item.requestId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Section 3: Browse Communities */}
      {browseCommunities.length > 0 && (
        <section className="mb-8">
          <h2 className="font-heading font-bold text-base mb-3">Browse Communities</h2>
          <div className="grid grid-cols-1 gap-4">
            {browseCommunities.map((item) => (
              <CommunityBrowseCard
                key={item.id}
                community={{
                  id: item.id,
                  name: item.name,
                  description: item.description,
                  memberCount: item.member_count,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* No browse results — only show when user has communities but browse is empty */}
      {browseCommunities.length === 0 && (myCommunities.length > 0 || pendingCommunities.length > 0) && (
        <div role="status" className="flex flex-col gap-2 py-4 text-center">
          <p className="font-heading font-bold text-base">No communities to browse</p>
          <p className="text-sm text-muted-foreground">
            All available communities have already been joined.
          </p>
        </div>
      )}

      <CreateCommunityDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  )
}
