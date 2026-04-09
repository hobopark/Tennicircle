'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createCommunity } from '@/lib/actions/communities'

interface CreateCommunityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function generateSlugPreview(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50)
}

export function CreateCommunityDialog({ open, onOpenChange }: CreateCommunityDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const slugPreview = generateSlugPreview(name)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    startTransition(async () => {
      const result = await createCommunity(name.trim(), description.trim() || undefined)
      if (result.success) {
        toast.success('Community created!')
        onOpenChange(false)
        setName('')
        setDescription('')
        router.refresh()
      } else {
        toast.error(result.error ?? "Couldn't create community. Check the name and try again.")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a New Community</DialogTitle>
          <DialogDescription>
            Set up your tennis community. Members can join via invite link or browse request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="community-name">Community Name</Label>
            <Input
              id="community-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sydney Tennis Club"
              required
              disabled={isPending}
            />
            {slugPreview && (
              <p className="text-xs text-muted-foreground">
                URL: tennicircle.com/c/{slugPreview}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="community-description">Description (optional)</Label>
            <Textarea
              id="community-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's your community about?"
              disabled={isPending}
            />
          </div>

          <Button type="submit" disabled={isPending || !name.trim()} className="mt-1">
            {isPending ? 'Creating...' : 'Create Community'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
