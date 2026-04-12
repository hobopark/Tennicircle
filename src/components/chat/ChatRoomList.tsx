'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, MessageCircle } from 'lucide-react'
import { ChatRoomListItem } from '@/components/chat/ChatRoomListItem'
import { CreateChatRoomDialog } from '@/components/chat/CreateChatRoomDialog'
import { getChatRooms } from '@/lib/actions/chat'
import { useCommunity } from '@/lib/context/community'
import type { ChatRoomListItem as ChatRoomListItemType } from '@/lib/types/chat'

interface ChatRoomListProps {
  chatrooms: ChatRoomListItemType[]
}

export function ChatRoomList({ chatrooms: initial }: ChatRoomListProps) {
  const { communityId } = useCommunity()
  const [chatrooms, setChatrooms] = useState(initial)
  const [createOpen, setCreateOpen] = useState(false)

  const refresh = useCallback(async () => {
    const result = await getChatRooms(communityId)
    if (result.success && result.chatrooms) {
      setChatrooms(result.chatrooms)
    }
  }, [communityId])

  // Poll every 10s for updated last messages and unread counts
  useEffect(() => {
    const interval = setInterval(refresh, 10_000)
    return () => clearInterval(interval)
  }, [refresh])

  // Also refresh when the tab becomes visible
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [refresh])

  // Sync with server-rendered data on prop change (e.g. after navigation)
  useEffect(() => {
    setChatrooms(initial)
  }, [initial])

  return (
    <div className="flex flex-col">
      {chatrooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageCircle className="w-8 h-8 text-muted mb-3" />
          <h2 className="text-[20px] font-bold text-foreground mb-2">No chatrooms yet</h2>
          <p className="text-base text-muted-foreground mb-4">Create a chatroom to start messaging.</p>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> New chatroom
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {chatrooms.map((chatroom, index) => (
              <ChatRoomListItem key={chatroom.id} chatroom={chatroom} index={index} />
            ))}
          </div>

          {/* FAB */}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="fixed bottom-20 right-5 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all cursor-pointer z-40"
            aria-label="New chatroom"
          >
            <Plus className="w-6 h-6" />
          </button>
        </>
      )}

      <CreateChatRoomDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
