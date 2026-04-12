'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MemberPicker } from '@/components/chat/MemberPicker'
import { createChatRoom, getCommunityMembersForPicker } from '@/lib/actions/chat'
import { useCommunity } from '@/lib/context/community'
import type { PickerMember } from '@/lib/types/chat'

interface CreateChatRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateChatRoomDialog({ open, onOpenChange }: CreateChatRoomDialogProps) {
  const { communityId, communitySlug, membershipId } = useCommunity()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [members, setMembers] = useState<PickerMember[]>([])

  useEffect(() => {
    if (!open) return
    getCommunityMembersForPicker(communityId).then(result => {
      if (result.success && result.members) setMembers(result.members)
    })
  }, [open, communityId])

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error('Please enter a chatroom name')
      return
    }
    startTransition(async () => {
      const result = await createChatRoom(communityId, communitySlug, name, selectedMembers)
      if (result.success && result.chatroomId) {
        toast.success('Chatroom created')
        onOpenChange(false)
        setName('')
        setSelectedMembers([])
        router.push(`/c/${communitySlug}/chat/${result.chatroomId}`)
      } else {
        toast.error(result.error ?? 'Failed to create chatroom')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New chatroom</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Name</label>
            <input
              type="text"
              placeholder="e.g. Weekend Group"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Add members</label>
            <MemberPicker
              members={members}
              selected={selectedMembers}
              onChange={setSelectedMembers}
              excludeIds={[membershipId]}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isPending || !name.trim()}>
            {isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
