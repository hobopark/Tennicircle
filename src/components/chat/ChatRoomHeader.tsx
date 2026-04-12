'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Settings, Users } from 'lucide-react'
import { useCommunity } from '@/lib/context/community'
import { ManageChatRoomDialog } from '@/components/chat/ManageChatRoomDialog'
import type { PickerMember } from '@/lib/types/chat'

interface ChatRoomHeaderProps {
  chatroomId: string
  name: string
  memberCount: number
  isManager: boolean
  members: PickerMember[]
}

export function ChatRoomHeader({ chatroomId, name, memberCount, isManager, members }: ChatRoomHeaderProps) {
  const { communitySlug } = useCommunity()
  const [manageOpen, setManageOpen] = useState(false)

  return (
    <>
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
        <Link
          href={`/c/${communitySlug}/chat`}
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Back to chats"
        >
          <ChevronLeft className="w-5 h-5 text-foreground" />
        </Link>

        <div className="flex-1 min-w-0">
          <h1 className="font-heading font-bold text-base truncate">{name}</h1>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" />
            {memberCount} member{memberCount !== 1 ? 's' : ''}
          </p>
        </div>

        {isManager && (
          <button
            type="button"
            onClick={() => setManageOpen(true)}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors cursor-pointer"
            aria-label="Manage chatroom"
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </button>
        )}
      </div>

      {isManager && (
        <ManageChatRoomDialog
          open={manageOpen}
          onOpenChange={setManageOpen}
          chatroomId={chatroomId}
          currentName={name}
          currentMembers={members}
        />
      )}
    </>
  )
}
