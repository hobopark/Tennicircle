'use client'

import { useState, useActionState, useEffect, useMemo, useTransition } from 'react'
import { Pencil, X, Trash2, Megaphone, ChevronRight, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateAnnouncement, deleteAnnouncement } from '@/lib/actions/announcements'
import { useCommunity } from '@/lib/context/community'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
  const { communityId, communitySlug } = useCommunity()
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()
  const router = useRouter()

  const boundUpdate = useMemo(
    () => updateAnnouncement.bind(null, communityId, communitySlug, announcement.id),
    [communityId, communitySlug, announcement.id]
  )
  const [state, formAction, isPending] = useActionState(boundUpdate, initialState)

  useEffect(() => {
    if (state.success) {
      setEditing(false)
      toast.success('Announcement updated')
      router.refresh()
    }
  }, [state.success, router])

  function handleDeleteConfirm() {
    startDeleteTransition(async () => {
      const result = await deleteAnnouncement(communityId, communitySlug, announcement.id)
      if (result.success) {
        setDeleteDialogOpen(false)
        toast.success('Announcement deleted')
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to delete')
      }
    })
  }

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

  // Compact view (default) — title + date, click to expand
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full bg-card rounded-2xl border border-border/50 px-4 py-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
      >
        <span className="shrink-0 w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Megaphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-bold text-sm truncate">{announcement.title}</h3>
          <p className="text-[10px] text-muted-foreground">
            {announcement.author?.display_name ?? 'Unknown'} · {formatAnnouncementDate(announcement.created_at)}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </button>
    )
  }

  // Expanded view — full details with edit/delete for coaches
  return (
    <div className="bg-card rounded-3xl border border-border/50 p-4 relative">
      <div className="flex items-center gap-2 absolute top-4 right-4">
        {canEdit && (
          <>
            <button
              type="button"
              aria-label="Edit announcement"
              onClick={() => setEditing(true)}
              className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80"
            >
              <Pencil size={14} className="text-muted-foreground" />
            </button>
            <button
              type="button"
              aria-label="Delete announcement"
              onClick={() => setDeleteDialogOpen(true)}
              className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center cursor-pointer hover:bg-orange-500/20"
            >
              <Trash2 size={14} className="text-orange-600 dark:text-orange-400" />
            </button>
          </>
        )}
        <button
          type="button"
          aria-label="Collapse"
          onClick={() => setExpanded(false)}
          className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80"
        >
          <X size={14} className="text-muted-foreground" />
        </button>
      </div>

      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
        ANNOUNCEMENT
      </span>

      <h3 className="font-heading font-bold text-base mt-1 mb-2 pr-28">
        {announcement.title}
      </h3>

      <p className="text-sm text-foreground mb-3 whitespace-pre-wrap">
        {announcement.body}
      </p>

      <p className="text-[10px] text-muted-foreground">
        {announcement.author?.display_name ?? 'Unknown'} · {formatAnnouncementDate(announcement.created_at)}
      </p>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-3xl border border-border/50">
          <DialogHeader>
            <DialogTitle className="font-heading font-bold text-2xl">
              Delete announcement?
            </DialogTitle>
            <DialogDescription>
              This will permanently remove this announcement. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(false)}
              className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-heading font-bold text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              Keep it
            </button>
            <button
              type="button"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="w-full h-12 rounded-2xl bg-orange-500 text-white font-heading font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              {isDeleting && <Loader2 className="animate-spin" size={16} />}
              Yes, delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
