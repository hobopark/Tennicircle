'use client'

import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { useCommunity } from '@/lib/context/community'
import type { ChatRoomListItem as ChatRoomListItemType } from '@/lib/types/chat'

function formatRelativeTime(isoString: string): string {
  const d = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d`
  return d.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', day: 'numeric', month: 'short' })
}

interface Props {
  chatroom: ChatRoomListItemType
  index: number
}

export function ChatRoomListItem({ chatroom, index }: Props) {
  const { communitySlug } = useCommunity()

  const lastMsgPreview = chatroom.lastMessage
    ? chatroom.lastMessage.image_url && !chatroom.lastMessage.content
      ? '📷 Photo'
      : chatroom.lastMessage.content ?? ''
    : 'No messages yet'

  const senderPrefix = chatroom.lastMessage?.sender_name
    ? `${chatroom.lastMessage.sender_name}: `
    : ''

  return (
    <div
      className="animate-fade-in-up"
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <Link
        href={`/c/${communitySlug}/chat/${chatroom.id}`}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border/50 shadow-[var(--shadow-card)] active:scale-[0.98] transition-transform cursor-pointer"
      >
        {/* Room icon */}
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-5 h-5 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className={`text-sm font-bold truncate ${chatroom.unreadCount > 0 ? 'text-foreground' : 'text-foreground'}`}>
              {chatroom.name}
            </h3>
            {chatroom.lastMessage && (
              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                {formatRelativeTime(chatroom.lastMessage.created_at)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className={`text-xs truncate ${chatroom.unreadCount > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {senderPrefix}{lastMsgPreview}
            </p>
            {chatroom.unreadCount > 0 && (
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ backgroundColor: '#c8e030', color: '#1a1a1a' }}
              >
                {chatroom.unreadCount > 9 ? '9+' : chatroom.unreadCount}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}
