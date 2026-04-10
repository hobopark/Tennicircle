'use client'

import { useState, useTransition } from 'react'
import { UserPlus, X, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { addInvitation, removeInvitation } from '@/lib/actions/invitations'
import { useCommunity } from '@/lib/context/community'
import { useRouter } from 'next/navigation'
import { InitialsAvatar } from '@/components/profile/InitialsAvatar'

interface Player {
  memberId: string
  displayName: string
  avatarUrl: string | null
}

interface InvitationManagerProps {
  templateId: string
  invitedPlayers: Player[]
  availablePlayers: Player[]
}

export function InvitationManager({ templateId, invitedPlayers, availablePlayers }: InvitationManagerProps) {
  const { communityId, communitySlug } = useCommunity()
  const router = useRouter()
  const [pendingAdd, setPendingAdd] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)
  const [isAdding, startAddTransition] = useTransition()
  const [isRemoving, startRemoveTransition] = useTransition()
  const [showPicker, setShowPicker] = useState(false)

  function handleAdd(memberId: string) {
    setPendingAdd(memberId)
    startAddTransition(async () => {
      const result = await addInvitation(communityId, communitySlug, templateId, memberId)
      if (result.success) {
        toast.success('Player invited')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to invite player')
      }
      setPendingAdd(null)
    })
  }

  function handleRemove(memberId: string) {
    setPendingRemove(memberId)
    startRemoveTransition(async () => {
      const result = await removeInvitation(communityId, communitySlug, templateId, memberId)
      if (result.success) {
        toast.success('Invitation removed')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to remove invitation')
      }
      setPendingRemove(null)
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-heading font-bold text-base">Invited Players ({invitedPlayers.length})</h2>
        {availablePlayers.length > 0 && (
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none rounded-lg px-2 py-1"
          >
            <UserPlus className="w-4 h-4" />
            {showPicker ? 'Done' : 'Add players'}
          </button>
        )}
      </div>

      {/* Invited list */}
      {invitedPlayers.length > 0 ? (
        <div className="flex flex-col gap-2 mb-4">
          {invitedPlayers.map(player => (
            <div
              key={player.memberId}
              className="flex items-center gap-3 bg-card rounded-2xl border border-border/50 p-3"
            >
              {player.avatarUrl ? (
                <img
                  src={player.avatarUrl}
                  alt={player.displayName}
                  className="w-8 h-8 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <InitialsAvatar name={player.displayName} size={32} className="rounded-xl flex-shrink-0" />
              )}
              <span className="text-sm font-bold text-foreground flex-1 truncate">
                {player.displayName}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(player.memberId)}
                disabled={isRemoving && pendingRemove === player.memberId}
                className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50"
                aria-label={`Remove ${player.displayName}`}
              >
                {isRemoving && pendingRemove === player.memberId
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <X className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border/50 p-6 text-center mb-4">
          <p className="text-sm text-muted-foreground">No players invited yet.</p>
          <p className="text-[10px] text-muted-foreground mt-1">Add players to allow them to RSVP to sessions from this template.</p>
        </div>
      )}

      {/* Player picker */}
      {showPicker && availablePlayers.length > 0 && (
        <div className="border border-border/50 rounded-2xl overflow-hidden">
          <div className="bg-muted/50 px-4 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Available Players</p>
          </div>
          <div className="flex flex-col divide-y divide-border/30">
            {availablePlayers.map(player => (
              <button
                key={player.memberId}
                type="button"
                onClick={() => handleAdd(player.memberId)}
                disabled={isAdding && pendingAdd === player.memberId}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors disabled:opacity-50 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                {player.avatarUrl ? (
                  <img
                    src={player.avatarUrl}
                    alt={player.displayName}
                    className="w-8 h-8 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <InitialsAvatar name={player.displayName} size={32} className="rounded-xl flex-shrink-0" />
                )}
                <span className="text-sm text-foreground flex-1 truncate">
                  {player.displayName}
                </span>
                {isAdding && pendingAdd === player.memberId
                  ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  : <Check className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
