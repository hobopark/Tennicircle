'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, ChevronDown, Shield, UserCheck, UserMinus, UserCog } from 'lucide-react'
import { InitialsAvatar } from '@/components/profile/InitialsAvatar'
import { RemoveMemberDialog } from '@/components/members/RemoveMemberDialog'
import { updateMemberRole, assignCoachToClient, removeCoachFromClient } from '@/lib/actions/members'
import { useCommunity } from '@/lib/context/community'
import { toast } from 'sonner'
import type { UserRole } from '@/lib/types/auth'
import { formatAttendanceDate } from '@/lib/utils/dates'

export interface MemberCardData {
  id: string
  displayName: string
  avatarUrl: string | null
  role: Exclude<UserRole, 'pending'>
  hasProfile: boolean
  lastSession: string | null
  assignedCoachNames: string[]
  isAssignedToMe: boolean
}

interface MemberCardProps {
  member: MemberCardData
  viewerRole: Exclude<UserRole, 'pending'>
  isSelf: boolean
}

export function MemberCard({ member, viewerRole, isSelf }: MemberCardProps) {
  const { communityId, communitySlug } = useCommunity()
  const [expanded, setExpanded] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const router = useRouter()

  function handleAssign() {
    startTransition(async () => {
      const result = await assignCoachToClient(communityId, communitySlug, member.id)
      if (result.success) {
        toast.success(`${member.displayName} assigned to you`)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to assign client')
      }
    })
  }

  function handleUnassign() {
    startTransition(async () => {
      const result = await removeCoachFromClient(communityId, communitySlug, member.id)
      if (result.success) {
        toast.success(`${member.displayName} removed from your clients`)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to unassign client')
      }
    })
  }

  function handleRoleChange(newRole: 'coach' | 'client' | 'admin') {
    startTransition(async () => {
      const result = await updateMemberRole(communityId, communitySlug, member.id, newRole)
      if (result.success) {
        toast.success(`${member.displayName} is now ${newRole}`)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to update role')
      }
    })
  }

  const roleBadgeColors: Record<string, string> = {
    admin: 'bg-amber-100 text-amber-800',
    coach: 'bg-blue-100 text-blue-800',
    client: 'bg-emerald-100 text-emerald-800',
  }

  const showActions = !isSelf && (viewerRole === 'admin' || viewerRole === 'coach')

  return (
    <>
      <div
        className={`bg-card rounded-2xl border border-border/50 p-4 shadow-[var(--shadow-card)] transition-colors ${
          !member.hasProfile ? 'opacity-60' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          {member.hasProfile && member.avatarUrl ? (
            <Image
              src={member.avatarUrl}
              width={40}
              height={40}
              className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
              alt={`${member.displayName}'s avatar`}
              unoptimized
            />
          ) : member.hasProfile ? (
            <div className="flex-shrink-0">
              <InitialsAvatar name={member.displayName} size={40} className="rounded-xl" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-muted flex-shrink-0" />
          )}

          {/* Name + metadata */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-foreground truncate">{member.displayName}</p>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${roleBadgeColors[member.role] ?? 'bg-muted text-muted-foreground'}`}>
                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
              </span>
            </div>
            {!member.hasProfile && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                Profile pending
              </span>
            )}
            {member.hasProfile && (
              <div className="flex flex-col mt-0.5">
                {member.assignedCoachNames.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    Coach: {member.assignedCoachNames.join(', ')}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {member.lastSession ? `Last session: ${formatAttendanceDate(member.lastSession)}` : 'No sessions yet'}
                </span>
              </div>
            )}
          </div>

          {/* Expand/action toggle */}
          {showActions ? (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-lg hover:bg-muted transition-colors flex-shrink-0"
              disabled={isPending}
            >
              <ChevronDown size={16} className={`text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          ) : member.hasProfile ? (
            <Link href={`/c/${communitySlug}/members/${member.id}`}>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </Link>
          ) : null}
        </div>

        {/* Expanded actions */}
        {expanded && showActions && (
          <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-2">
            {/* Coach assignment actions (D-09) */}
            {(viewerRole === 'coach' || viewerRole === 'admin') && member.role === 'client' && (
              member.isAssignedToMe ? (
                <button
                  onClick={handleUnassign}
                  disabled={isPending}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
                >
                  <UserMinus size={12} />
                  Remove from my clients
                </button>
              ) : (
                <button
                  onClick={handleAssign}
                  disabled={isPending}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-[#265178] transition-colors disabled:opacity-50"
                >
                  <UserCheck size={12} />
                  Assign to me
                </button>
              )
            )}

            {/* Admin role management actions (D-07, MGMT-02, MGMT-03) */}
            {viewerRole === 'admin' && (
              <>
                {member.role === 'client' && (
                  <button
                    onClick={() => handleRoleChange('coach')}
                    disabled={isPending}
                    className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <UserCog size={12} />
                    Promote to Coach
                  </button>
                )}
                {member.role !== 'admin' && (
                  <button
                    onClick={() => handleRoleChange('admin')}
                    disabled={isPending}
                    className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <Shield size={12} />
                    Grant Admin
                  </button>
                )}
                {member.role === 'coach' && (
                  <button
                    onClick={() => handleRoleChange('client')}
                    disabled={isPending}
                    className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <UserCog size={12} />
                    Demote to Client
                  </button>
                )}
                <button
                  onClick={() => setShowRemoveDialog(true)}
                  disabled={isPending}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-orange-300 text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50"
                >
                  Remove
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <RemoveMemberDialog
        open={showRemoveDialog}
        onOpenChange={setShowRemoveDialog}
        memberId={member.id}
        memberName={member.displayName}
      />
    </>
  )
}
