'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ArrowDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCommunity } from '@/lib/context/community'
import { ChatMessageBubble } from '@/components/chat/ChatMessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
import { ChatRoomHeader } from '@/components/chat/ChatRoomHeader'
import { getChatRoomMessages, updateReadCursor } from '@/lib/actions/chat'
import type { ChatMessageWithSender, PickerMember } from '@/lib/types/chat'

interface ChatRoomProps {
  chatroomId: string
  chatroomName: string
  isManager: boolean
  members: PickerMember[]
  initialMessages: ChatMessageWithSender[]
}

/** Date separator label */
function formatDateLabel(isoString: string): string {
  const d = new Date(isoString)
  const now = new Date()
  const sydneyFmt = (date: Date) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

  const dateStr = sydneyFmt(d)
  const todayStr = sydneyFmt(now)
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = sydneyFmt(yesterday)

  if (dateStr === todayStr) return 'Today'
  if (dateStr === yesterdayStr) return 'Yesterday'
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
}

function isSameDay(a: string, b: string): boolean {
  const fmt = (d: string) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d))
  return fmt(a) === fmt(b)
}

export function ChatRoom({ chatroomId, chatroomName, isManager, members, initialMessages }: ChatRoomProps) {
  const { communityId, membershipId } = useCommunity()
  // Messages are stored newest-first internally, reversed for display
  const [messages, setMessages] = useState<ChatMessageWithSender[]>(initialMessages)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(initialMessages.length >= 50)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isAtBottomRef = useRef(true)

  // Scroll to bottom
  const scrollToBottom = useCallback((smooth = false) => {
    bottomRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'instant' })
  }, [])

  // Initial scroll to bottom
  useEffect(() => {
    scrollToBottom()
    updateReadCursor(chatroomId)
  }, [chatroomId, scrollToBottom])

  // Track scroll position for scroll-to-bottom button
  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    isAtBottomRef.current = atBottom
    setShowScrollDown(!atBottom)
  }

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`chatroom-${chatroomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chatroom_id=eq.${chatroomId}`,
        },
        async (payload) => {
          const newMsg = payload.new as { id: string; chatroom_id: string; sender_id: string | null; content: string | null; image_url: string | null; created_at: string }

          // If this is our own message, we already have it optimistically — replace the optimistic one with the real one
          const isOwnMessage = newMsg.sender_id === membershipId

          if (isOwnMessage) {
            setMessages(prev => {
              // Already have the real message? skip
              if (prev.some(m => m.id === newMsg.id)) return prev
              // Replace the oldest optimistic message with the real one
              const optimisticIdx = prev.findIndex(m => m.id.startsWith('optimistic-'))
              if (optimisticIdx !== -1) {
                const updated = [...prev]
                updated[optimisticIdx] = {
                  ...newMsg,
                  sender: prev[optimisticIdx].sender,
                }
                return updated
              }
              return prev
            })
          } else {
            // Message from someone else — fetch with sender info and add
            const result = await getChatRoomMessages(chatroomId, undefined, 1)
            if (result.success && result.messages && result.messages.length > 0) {
              const fullMsg = result.messages[0]
              setMessages(prev => {
                if (prev.some(m => m.id === fullMsg.id)) return prev
                return [fullMsg, ...prev]
              })
            }
          }

          // Auto-scroll if at bottom
          if (isAtBottomRef.current) {
            setTimeout(() => scrollToBottom(true), 50)
          }

          // Update read cursor
          updateReadCursor(chatroomId)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [chatroomId, scrollToBottom])

  // Load older messages
  const loadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)

    const oldest = messages[messages.length - 1]
    const result = await getChatRoomMessages(chatroomId, oldest?.created_at)

    if (result.success && result.messages) {
      if (result.messages.length < 50) setHasMore(false)
      setMessages(prev => [...prev, ...result.messages!])
    }
    setLoadingMore(false)
  }

  // Optimistic send
  const handleOptimisticSend = (content: string | null, imageUrl: string | null) => {
    const optimistic: ChatMessageWithSender = {
      id: `optimistic-${Date.now()}`,
      chatroom_id: chatroomId,
      sender_id: membershipId,
      content,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
      sender: {
        display_name: 'You',
        avatar_url: null,
        member_id: membershipId,
      },
    }
    setMessages(prev => [optimistic, ...prev])
    setTimeout(() => scrollToBottom(true), 50)
  }

  // Messages displayed oldest-first
  const displayMessages = [...messages].reverse()

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      <ChatRoomHeader
        chatroomId={chatroomId}
        name={chatroomName}
        memberCount={members.length}
        isManager={isManager}
        members={members}
      />

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-3"
        onScroll={handleScroll}
      >
        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center mb-4">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full bg-muted/50 cursor-pointer"
            >
              {loadingMore ? 'Loading...' : 'Load older messages'}
            </button>
          </div>
        )}

        {displayMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          {displayMessages.map((msg, i) => {
            const prevMsg = i > 0 ? displayMessages[i - 1] : null
            const showDateSep = !prevMsg || !isSameDay(prevMsg.created_at, msg.created_at)
            const showSender = !prevMsg || prevMsg.sender_id !== msg.sender_id || showDateSep
            const isOwn = msg.sender_id === membershipId

            return (
              <div key={msg.id}>
                {showDateSep && (
                  <div className="flex justify-center my-3">
                    <span className="text-[10px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                      {formatDateLabel(msg.created_at)}
                    </span>
                  </div>
                )}
                <ChatMessageBubble
                  message={msg}
                  isOwn={isOwn}
                  showSender={showSender}
                />
              </div>
            )
          })}
        </div>

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {showScrollDown && (
        <button
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-24 right-5 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center cursor-pointer z-20"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="w-4 h-4 text-foreground" />
        </button>
      )}

      <ChatInput
        chatroomId={chatroomId}
        communityId={communityId}
        onOptimisticSend={handleOptimisticSend}
      />
    </div>
  )
}
