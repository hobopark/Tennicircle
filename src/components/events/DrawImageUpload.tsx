'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface DrawImageUploadProps {
  eventId?: string
  communityId: string
  onUpload: (url: string) => void
}

export function DrawImageUpload({ eventId, communityId, onUpload }: DrawImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  function handleClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // T-04-07: Client-side type validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image.')
      return
    }

    // T-04-07: Client-side 5MB size limit
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB. Try a smaller file.')
      return
    }

    setIsUploading(true)

    try {
      const supabase = createClient()
      const path = `${communityId}/${eventId ?? 'temp'}/draw-${Date.now()}`

      const { error: uploadError } = await supabase.storage
        .from('event-draws')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) {
        toast.error('Failed to upload draw image. Please try again.')
        return
      }

      const { data } = supabase.storage.from('event-draws').getPublicUrl(path)

      setPreviewUrl(URL.createObjectURL(file))
      onUpload(data.publicUrl)
      toast.success('Draw image uploaded')
    } catch {
      toast.error('Failed to upload draw image. Please try again.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload draw image"
      />

      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Draw preview"
          className="h-24 rounded-2xl object-cover w-full cursor-pointer"
          onClick={handleClick}
        />
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={isUploading}
          className="w-full h-24 rounded-2xl border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer disabled:pointer-events-none"
        >
          <span className="text-sm text-muted-foreground">
            {isUploading ? 'Uploading...' : 'Upload draw image (optional)'}
          </span>
        </button>
      )}

      <p className="text-[10px] text-muted-foreground">
        Upload a photo of your bracket. PNG or JPG, up to 5 MB.
      </p>
    </div>
  )
}
