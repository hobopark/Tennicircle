'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { toast } from 'sonner'
import { X, Shield, ShieldOff } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MemberPicker } from '@/components/chat/MemberPicker'
import { InitialsAvatar } from '@/components/profile/InitialsAvatar'
import {
  renameChatRoom,
  addChatRoomMembers,
  removeChatRoomMember,
  toggleChatRoomManager,
  getCommunityMembersForPicker,
} from '@/lib/actions/chat'
import { useCommunity } from '@/lib/context/community'
import type { PickerMember } from '@/lib/types/chat'

interface ManageChatRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  chatroomId: string
  currentName: string
  currentMembers: PickerMember[]
}

export function ManageChatRoomDialog({
  open,
  onOpenChange,
  chatroomId,
  currentName,
  currentMembers,
}: ManageChatRoomDialogProps) {
  const { communityId, communitySlug, membershipId } = useCommunity()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState(currentName)
  const [allMembers, setAllMembers] = useState<PickerMember[]>([])
  const [newMemberIds, setNewMemberIds] = useState<string[]>([])
  const [showAddMembers, setShowAddMembers] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<PickerMember | null>(null)
  const [confirmPromote, setConfirmPromote] = useState<PickerMember | null>(null)

  useEffect(() => {
    setName(currentName)
  }, [currentName])

  useEffect(() => {
    if (!open || !showAddMembers) return
    getCommunityMembersForPicker(communityId).then(result => {
      if (result.success && result.members) setAllMembers(result.members)
    })
  }, [open, showAddMembers, communityId])

  const handleRename = () => {
    if (!name.trim() || name.trim() === currentName) return
    startTransition(async () => {
      const result = await renameChatRoom(communitySlug, chatroomId, name)
      if (result.success) {
        toast.success('Chatroom renamed')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to rename')
      }
    })
  }

  const handleRemoveMember = (member: PickerMember) => {
    setConfirmRemove(member)
  }

  const confirmRemoveMember = () => {
    if (!confirmRemove) return
    const memberId = confirmRemove.id
    setConfirmRemove(null)
    startTransition(async () => {
      const result = await removeChatRoomMember(communitySlug, chatroomId, memberId)
      if (result.success) {
        toast.success('Member removed')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to remove member')
      }
    })
  }

  const handleToggleManager = (member: PickerMember) => {
    const isCurrentlyManager = member.chatroomRole === 'manager'
    if (!isCurrentlyManager) {
      // Promote — show confirmation
      setConfirmPromote(member)
      return
    }
    // Demote — no confirmation needed
    doToggleManager(member, false)
  }

  const doToggleManager = (member: PickerMember, makeManager: boolean) => {
    startTransition(async () => {
      const result = await toggleChatRoomManager(communitySlug, chatroomId, member.id, makeManager)
      if (result.success) {
        toast.success(
          makeManager
            ? `${member.display_name ?? 'Member'} is now a manager`
            : `${member.display_name ?? 'Member'} is no longer a manager`
        )
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to update role')
      }
    })
  }

  const confirmPromoteMember = () => {
    if (!confirmPromote) return
    const member = confirmPromote
    setConfirmPromote(null)
    doToggleManager(member, true)
  }

  const handleAddMembers = () => {
    if (newMemberIds.length === 0) return
    startTransition(async () => {
      const result = await addChatRoomMembers(communitySlug, chatroomId, newMemberIds)
      if (result.success) {
        toast.success(`${newMemberIds.length} member${newMemberIds.length > 1 ? 's' : ''} added`)
        setNewMemberIds([])
        setShowAddMembers(false)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to add members')
      }
    })
  }

  const existingMemberIds = currentMembers.map(m => m.id)

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage chatroom</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-5 py-2">
            {/* Rename */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Name</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button
                  onClick={handleRename}
                  disabled={isPending || !name.trim() || name.trim() === currentName}
                  size="sm"
                >
                  Save
                </Button>
              </div>
            </div>

            {/* Current members */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Members ({currentMembers.length})
              </label>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {currentMembers.map(m => {
                  const isManager = m.chatroomRole === 'manager'
                  const isSelf = m.id === membershipId
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-xl">
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        {m.avatar_url ? (
                          <Image
                            src={m.avatar_url}
                            width={32}
                            height={32}
                            alt={m.display_name ?? ''}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <InitialsAvatar
                            name={m.display_name ?? '?'}
                            size={32}
                            className="rounded-full"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {m.display_name ?? 'Unknown'}
                          {isSelf && (
                            <span className="text-[10px] text-muted-foreground ml-1">(you)</span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground capitalize flex items-center gap-1">
                          {isManager && <Shield className="w-3 h-3 text-primary" />}
                          {isManager ? 'Manager' : m.role}
                        </p>
                      </div>
                      {!isSelf && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleManager(m)}
                            disabled={isPending}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                              isManager
                                ? 'text-orange-500 hover:bg-orange-500/10'
                                : 'text-primary hover:bg-primary/10'
                            }`}
                            aria-label={isManager ? `Remove manager role from ${m.display_name}` : `Make ${m.display_name} a manager`}
                            title={isManager ? 'Remove manager' : 'Make manager'}
                          >
                            {isManager ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m)}
                            disabled={isPending}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-orange-500 hover:bg-orange-500/10 transition-colors cursor-pointer"
                            aria-label={`Remove ${m.display_name}`}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Add members */}
            {showAddMembers ? (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Add members</label>
                <MemberPicker
                  members={allMembers}
                  selected={newMemberIds}
                  onChange={setNewMemberIds}
                  excludeIds={existingMemberIds}
                />
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => { setShowAddMembers(false); setNewMemberIds([]) }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddMembers} disabled={isPending || newMemberIds.length === 0}>
                    Add {newMemberIds.length > 0 ? `(${newMemberIds.length})` : ''}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setShowAddMembers(true)}>
                Add members
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <Dialog open={!!confirmRemove} onOpenChange={() => setConfirmRemove(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Remove member?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {confirmRemove?.display_name ?? 'this member'} from the chatroom?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmRemoveMember}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote to manager confirmation */}
      <Dialog open={!!confirmPromote} onOpenChange={() => setConfirmPromote(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Make manager?</DialogTitle>
            <DialogDescription>
              {confirmPromote?.display_name ?? 'This member'} will be able to rename the chatroom, add and remove members, and manage other members.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPromote(null)}>
              Cancel
            </Button>
            <Button onClick={confirmPromoteMember}>
              Make manager
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
