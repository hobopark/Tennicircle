'use client'

import { useState, useTransition } from 'react'
import { UserPlus } from 'lucide-react'
import { createInviteLink } from '@/lib/actions/invites'
import { useCommunity } from '@/lib/context/community'
import { toast } from 'sonner'
import type { UserRole } from '@/lib/types/auth'

interface InviteButtonProps {
  userRole: Exclude<UserRole, 'pending'>
}

export function InviteButton({ userRole }: InviteButtonProps) {
  const { communityId, communitySlug } = useCommunity()
  const [isPending, startTransition] = useTransition()
  const [selectedRole, setSelectedRole] = useState<'coach' | 'client'>('client')

  function handleInvite() {
    startTransition(async () => {
      const roleToInvite = userRole === 'admin' ? selectedRole : 'client'
      const result = await createInviteLink(communityId, communitySlug, roleToInvite)
      if (result.success && result.data) {
        const url = `${window.location.origin}/auth?invite=${result.data.token}`
        try {
          await navigator.clipboard.writeText(url)
          toast.success('Invite link copied!')
        } catch {
          // Fallback: show the URL in toast for manual copy
          toast.success(`Invite link: ${url}`)
        }
      } else {
        toast.error(result.error ?? 'Failed to generate invite link')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      {userRole === 'admin' && (
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as 'coach' | 'client')}
          className="h-9 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground"
        >
          <option value="client">Client</option>
          <option value="coach">Coach</option>
        </select>
      )}
      <button
        onClick={handleInvite}
        disabled={isPending}
        className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-[#265178] active:bg-[#1F4466] transition-colors disabled:opacity-50"
      >
        <UserPlus size={14} />
        {isPending ? 'Generating...' : 'Invite'}
      </button>
    </div>
  )
}
