'use client'

import { useRef, useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface AvatarUploadProps {
  communityId: string | null
  userId: string
  currentAvatarUrl: string | null
  displayName: string
  onAvatarChange: (url: string | null) => void
}

export function AvatarUpload({
  communityId,
  userId,
  currentAvatarUrl,
  displayName,
  onAvatarChange,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPEG, PNG, or WebP image.')
      return
    }

    // Validate file size: 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB. Try a smaller file.')
      return
    }

    setIsUploading(true)

    try {
      // Create object URL for the image
      const objectUrl = URL.createObjectURL(file)

      // Square crop via canvas
      const blob = await new Promise<Blob>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const cropSize = Math.min(img.naturalWidth, img.naturalHeight)
          const sx = (img.naturalWidth - cropSize) / 2
          const sy = (img.naturalHeight - cropSize) / 2

          const canvas = document.createElement('canvas')
          canvas.width = 400
          canvas.height = 400
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Could not get canvas context'))
            return
          }
          ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, 400, 400)
          canvas.toBlob(
            b => {
              if (b) resolve(b)
              else reject(new Error('Failed to create image blob'))
            },
            'image/jpeg',
            0.9
          )
          URL.revokeObjectURL(objectUrl)
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = objectUrl
      })

      // Upload to Supabase Storage
      const supabase = createClient()
      const path = `${communityId ?? 'global'}/${userId}/avatar`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: blob.type })

      if (uploadError) {
        setError(uploadError.message)
        toast.error('Failed to upload avatar. Please try again.')
        return
      }

      // Get public URL (synchronous — no await)
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)

      // Create local preview URL from the cropped blob
      const localPreview = URL.createObjectURL(blob)
      setPreviewUrl(localPreview)
      onAvatarChange(data.publicUrl)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setError(message)
      toast.error('Failed to upload avatar. Please try again.')
    } finally {
      setIsUploading(false)
      // Reset input so same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload avatar photo"
      />

      {previewUrl ? (
        <button
          type="button"
          onClick={handleClick}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-2xl"
          aria-label="Change avatar photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            className="w-20 h-20 rounded-2xl object-cover"
            alt={`${displayName}'s avatar`}
          />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={isUploading}
          aria-label="Upload avatar photo"
          className="w-20 h-20 rounded-2xl border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer min-h-[44px] min-w-[44px] hover:bg-muted/80 transition-colors disabled:pointer-events-none"
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          ) : (
            <Plus className="w-6 h-6 text-muted-foreground" />
          )}
        </button>
      )}

      {error && (
        <p className="text-destructive text-sm mt-1">{error}</p>
      )}
    </div>
  )
}
