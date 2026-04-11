'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { requestToJoin, cancelJoinRequest } from '@/lib/actions/communities'

interface CommunityBrowseCardProps {
  community: {
    id: string
    name: string
    description: string | null
    memberCount: number
  }
  pendingRequestId?: string
}

type CardState = 'default' | 'pending'

export function CommunityBrowseCard({ community, pendingRequestId }: CommunityBrowseCardProps) {
  const [isPending, startTransition] = useTransition()
  const [isCancelling, startCancelTransition] = useTransition()
  const [state, setState] = useState<CardState>(pendingRequestId ? 'pending' : 'default')
  const [currentRequestId, setCurrentRequestId] = useState<string | undefined>(pendingRequestId)

  function handleRequestToJoin() {
    startTransition(async () => {
      const result = await requestToJoin(community.id)
      if (result.success) {
        setState('pending')
        toast.success('Request sent! You\'ll be notified when approved.')
      } else {
        toast.error(result.error ?? "Couldn't send your request. Please try again.")
      }
    })
  }

  function handleCancelRequest() {
    if (!currentRequestId) return
    startCancelTransition(async () => {
      const result = await cancelJoinRequest(currentRequestId)
      if (result.success) {
        setState('default')
        setCurrentRequestId(undefined)
        toast('Request cancelled.')
      } else {
        toast.error(result.error ?? 'Failed to cancel request. Please try again.')
      }
    })
  }

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-4 flex flex-col gap-3 shadow-[var(--shadow-card)]">
      {/* Community name */}
      <span className="font-heading font-bold text-base leading-tight">
        {community.name}
      </span>

      {/* Description — omit if empty */}
      {community.description && (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {community.description}
        </p>
      )}

      {/* Member count */}
      <p className="text-xs text-muted-foreground">
        {community.memberCount} {community.memberCount === 1 ? 'member' : 'members'}
      </p>

      {/* Join button area */}
      <div className="flex flex-col gap-2">
        {state === 'default' ? (
          <button
            type="button"
            onClick={handleRequestToJoin}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium whitespace-nowrap transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Requesting...
              </>
            ) : (
              'Request to Join'
            )}
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled
              className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg border border-transparent bg-gold text-gold-foreground text-sm font-medium whitespace-nowrap cursor-not-allowed opacity-90"
            >
              Pending Approval
            </button>
            <button
              type="button"
              onClick={handleCancelRequest}
              disabled={isCancelling}
              className="text-sm text-gold underline text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCancelling ? 'Cancelling...' : 'Cancel request'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
