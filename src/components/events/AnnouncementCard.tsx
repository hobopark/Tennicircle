'use client'

import { Pencil } from 'lucide-react'
import type { AnnouncementWithAuthor } from '@/lib/types/events'

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

export function AnnouncementCard({ announcement, canEdit }: AnnouncementCardProps) {
  return (
    <div className="bg-card rounded-3xl border border-border/50 p-4 relative">
      {/* Edit button — top right */}
      {canEdit && (
        <button
          type="button"
          aria-label="Edit announcement"
          className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
        >
          <Pencil size={14} className="text-muted-foreground" />
        </button>
      )}

      {/* Badge */}
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
        ANNOUNCEMENT
      </span>

      {/* Title */}
      <h3 className="font-heading font-bold text-base mt-1 mb-1">
        {announcement.title}
      </h3>

      {/* Body */}
      <p className="text-sm text-foreground line-clamp-3 mb-2">
        {announcement.body}
      </p>

      {/* Author + date */}
      <p className="text-[10px] text-muted-foreground">
        {announcement.author?.display_name ?? 'Unknown'} · {formatAnnouncementDate(announcement.created_at)}
      </p>
    </div>
  )
}
