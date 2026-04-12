'use client'

import { useState, useRef, useTransition } from 'react'
import Image from 'next/image'
import { Send, ImagePlus, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { sendMessage } from '@/lib/actions/chat'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface ChatInputProps {
  chatroomId: string
  communityId: string
  onOptimisticSend?: (content: string | null, imageUrl: string | null) => void
}

export function ChatInput({ chatroomId, communityId, onOptimisticSend }: ChatInputProps) {
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Please select a JPEG, PNG, or WebP image')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Image must be under 10MB')
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImageFile(null)
    setImagePreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSend = () => {
    const content = text.trim() || null
    if (!content && !imageFile) return

    startTransition(async () => {
      let imageUrl: string | null = null

      // Upload image if attached
      if (imageFile) {
        const supabase = createClient()
        const ext = imageFile.name.split('.').pop() ?? 'jpg'
        const path = `${communityId}/${chatroomId}/${crypto.randomUUID()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(path, imageFile, { contentType: imageFile.type })

        if (uploadError) {
          toast.error('Failed to upload image')
          return
        }

        const { data: urlData } = supabase.storage
          .from('chat-media')
          .getPublicUrl(path)

        imageUrl = urlData.publicUrl
      }

      // Optimistic update
      onOptimisticSend?.(content, imageUrl)

      // Send message
      const result = await sendMessage(chatroomId, content, imageUrl)
      if (!result.success) {
        toast.error(result.error ?? 'Failed to send message')
      }

      // Reset
      setText('')
      clearImage()
      textareaRef.current?.focus()
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-grow textarea
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const canSend = (text.trim() || imageFile) && !isPending

  return (
    <div className="border-t border-border bg-card px-4 py-3">
      {/* Image preview */}
      {imagePreview && (
        <div className="relative inline-block mb-2">
          <Image
            src={imagePreview}
            width={80}
            height={80}
            alt="Attachment preview"
            className="w-20 h-20 rounded-xl object-cover"
            unoptimized
          />
          <button
            type="button"
            onClick={clearImage}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Image attach */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer flex-shrink-0"
          aria-label="Attach image"
        >
          <ImagePlus className="w-5 h-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleImageSelect}
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="Message..."
          rows={1}
          className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          style={{ maxHeight: 120 }}
        />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
            canSend
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted text-muted-foreground'
          }`}
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
