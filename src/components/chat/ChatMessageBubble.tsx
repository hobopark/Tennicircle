'use client'

import Image from 'next/image'
import { useState } from 'react'
import { InitialsAvatar } from '@/components/profile/InitialsAvatar'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import type { ChatMessageWithSender } from '@/lib/types/chat'

function formatMessageTime(isoString: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(isoString))
}

interface Props {
  message: ChatMessageWithSender
  isOwn: boolean
  showSender: boolean
}

export function ChatMessageBubble({ message, isOwn, showSender }: Props) {
  const [imageOpen, setImageOpen] = useState(false)

  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar — only for others, only when showSender */}
      {!isOwn && showSender ? (
        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 mt-1">
          {message.sender?.avatar_url ? (
            <Image
              src={message.sender.avatar_url}
              width={28}
              height={28}
              alt={message.sender.display_name ?? ''}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <InitialsAvatar
              name={message.sender?.display_name ?? '?'}
              size={28}
              className="rounded-full"
            />
          )}
        </div>
      ) : !isOwn ? (
        <div className="w-7 flex-shrink-0" />
      ) : null}

      {/* Bubble */}
      <div className={`max-w-[75%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name */}
        {!isOwn && showSender && message.sender?.display_name && (
          <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
            {message.sender.display_name}
          </span>
        )}

        <div
          className={`rounded-2xl px-3 py-2 ${
            isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted/60'
          }`}
        >
          {/* Image */}
          {message.image_url && (
            <>
              <button
                type="button"
                onClick={() => setImageOpen(true)}
                className="cursor-pointer mb-1"
              >
                <Image
                  src={message.image_url}
                  width={240}
                  height={180}
                  alt="Shared photo"
                  className="rounded-xl object-cover max-h-48"
                  unoptimized
                />
              </button>
              <Dialog open={imageOpen} onOpenChange={setImageOpen}>
                <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 bg-transparent border-0 shadow-none">
                  <Image
                    src={message.image_url}
                    width={800}
                    height={600}
                    alt="Shared photo"
                    className="w-full h-auto rounded-xl object-contain max-h-[85vh]"
                    unoptimized
                  />
                </DialogContent>
              </Dialog>
            </>
          )}

          {/* Text */}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>

        {/* Timestamp */}
        <span className={`text-[10px] text-muted-foreground mt-0.5 px-1 ${isOwn ? 'text-right' : ''}`}>
          {formatMessageTime(message.created_at)}
        </span>
      </div>
    </div>
  )
}
