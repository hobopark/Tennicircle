'use client'

import { useState, useActionState, useEffect } from 'react'
import { Pencil, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateAnnouncement } from '@/lib/actions/announcements'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { AnnouncementWithAuthor, AnnouncementActionResult } from '@/lib/types/events'

function formatAnnouncementDate(createdAt: string): string {
  const date = new Date(createdAt)
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

interface AnnouncementCardProps {
  announcement: AnnouncementWithAuthor
  canEdit?: boolean
}

const initialState: AnnouncementActionResult = { success: false }

export function AnnouncementCard({ announcement, canEdit }: AnnouncementCardProps) {
  const [editing, setEditing] = useState(false)
  const router = useRouter()

  const boundUpdate = updateAnnouncement.bind(null, announcement.id)
  const [state, formAction, isPending] = useActionState(boundUpdate, initialState)

  useEffect(() => {
    if (state.success) {
      setEditing(false)
      toast.success('Announcement updated')
      router.refresh()
    }
  }, [state.success, router])

  if (editing) {
    return (
      <div className="bg-card rounded-3xl border border-primary/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
            EDITING ANNOUNCEMENT
          </span>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
          >
            <X size={14} className="text-muted-foreground" />
          </button>
        </div>
        <form action={formAction} className="flex flex-col gap-3">
          {state.error && (
            <p className="text-destructive text-sm">{state.error}</p>
          )}
          <Input
            name="title"
            defaultValue={announcement.title}
            required
            maxLength={80}
            className="h-10 rounded-xl"
            placeholder="Title"
          />
          <Textarea
            name="body"
            defaultValue={announcement.body}
            required
            maxLength={400}
            className="min-h-20 rounded-xl"
            placeholder="Announcement body"
          />
          <button
            type="submit"
            disabled={isPending}
            className="w-full h-10 rounded-xl font-heading font-bold bg-primary text-primary-foreground text-sm disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-3xl border border-border/50 p-4 relative">
      {canEdit && (
        <button
          type="button"
          aria-label="Edit announcement"
          onClick={() => setEditing(true)}
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80"
        >
          <Pencil size={14} className="text-muted-foreground" />
        </button>
      )}

      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
        ANNOUNCEMENT
      </span>

      <h3 className="font-heading font-bold text-base mt-1 mb-1">
        {announcement.title}
      </h3>

      <p className="text-sm text-foreground line-clamp-3 mb-2">
        {announcement.body}
      </p>

      <p className="text-[10px] text-muted-foreground">
        {announcement.author?.display_name ?? 'Unknown'} · {formatAnnouncementDate(announcement.created_at)}
      </p>
    </div>
  )
}
