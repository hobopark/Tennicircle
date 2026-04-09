'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { approveJoinRequest } from '@/lib/actions/communities'
import { InitialsAvatar } from '@/components/profile/InitialsAvatar'
import { Button } from '@/components/ui/button'
import { RejectRequestDialog } from '@/components/communities/RejectRequestDialog'

interface PendingRequest {
  id: string
  user_id: string
  created_at: string
  display_name: string | null
  avatar_url: string | null
}

interface PendingRequestsProps {
  requests: PendingRequest[]
  communitySlug: string
}

function formatJoinDate(isoString: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoString))
}

function RequestRow({
  request,
  communitySlug,
  onApproved,
}: {
  request: PendingRequest
  communitySlug: string
  onApproved: (id: string) => void
}) {
  const [isPendingApprove, startApproveTransition] = useTransition()
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const displayName = request.display_name ?? 'Unknown'

  function handleApprove() {
    startApproveTransition(async () => {
      const result = await approveJoinRequest(request.id, communitySlug)
      if (result.success) {
        toast.success(`Approved. ${displayName} is now a member.`)
        onApproved(request.id)
      } else {
        toast.error(result.error ?? 'Failed to approve request.')
      }
    })
  }

  return (
    <>
      <div className="flex items-center gap-3 py-2">
        {/* Avatar */}
        {request.avatar_url ? (
          <Image
            src={request.avatar_url}
            width={36}
            height={36}
            className="w-9 h-9 rounded-xl object-cover flex-shrink-0"
            alt={`${displayName}'s avatar`}
            unoptimized
          />
        ) : (
          <div className="flex-shrink-0">
            <InitialsAvatar name={displayName} size={36} className="rounded-xl" />
          </div>
        )}

        {/* Name + date */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground">
            Requested {formatJoinDate(request.created_at)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            className="text-xs h-8"
            onClick={handleApprove}
            disabled={isPendingApprove}
          >
            {isPendingApprove ? 'Approving…' : 'Approve Member'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8 hover:border-orange-400 hover:text-orange-600"
            onClick={() => setRejectDialogOpen(true)}
            disabled={isPendingApprove}
          >
            Reject
          </Button>
        </div>
      </div>

      <RejectRequestDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        memberName={displayName}
        requestId={request.id}
        communitySlug={communitySlug}
      />
    </>
  )
}

export function PendingRequestsSection({ requests, communitySlug }: PendingRequestsProps) {
  const [visibleRequests, setVisibleRequests] = useState(requests)

  function handleApproved(id: string) {
    setVisibleRequests(prev => prev.filter(r => r.id !== id))
  }

  if (visibleRequests.length === 0) return null

  return (
    <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900/50 p-4">
      <div className="flex items-center mb-2">
        <span className="font-heading font-bold text-base text-foreground">
          Pending Requests
        </span>
        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full ml-2">
          {visibleRequests.length}
        </span>
      </div>
      <div className="flex flex-col divide-y divide-orange-100 dark:divide-orange-900/30">
        {visibleRequests.map(req => (
          <RequestRow
            key={req.id}
            request={req}
            communitySlug={communitySlug}
            onApproved={handleApproved}
          />
        ))}
      </div>
    </div>
  )
}
