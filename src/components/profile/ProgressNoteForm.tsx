'use client'

import { useState, useTransition, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { addProgressNote } from '@/lib/actions/profiles'
import { useCommunity } from '@/lib/context/community'

interface ProgressNoteFormProps {
  sessionId: string
  subjectMemberId: string
  playerName: string
  existingNote?: { note_text: string } | null
}

const MAX_NOTE_LENGTH = 2000
const COUNTER_THRESHOLD = 1800

export function ProgressNoteForm({
  sessionId,
  subjectMemberId,
  playerName,
  existingNote,
}: ProgressNoteFormProps) {
  const { communityId, communitySlug } = useCommunity()
  const [expanded, setExpanded] = useState(false)
  const [noteText, setNoteText] = useState(existingNote?.note_text ?? '')
  const [displayedNote, setDisplayedNote] = useState(existingNote?.note_text ?? '')
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const charCount = noteText.length
  const showCounter = charCount > COUNTER_THRESHOLD

  function handleExpand() {
    setExpanded(true)
  }

  function handleCancel() {
    setNoteText(displayedNote)
    setExpanded(false)
  }

  function handleSave() {
    startTransition(async () => {
      const result = await addProgressNote(communityId, communitySlug, {
        sessionId,
        subjectMemberId,
        noteText,
      })
      if (result.success) {
        toast.success('Note saved')
        setDisplayedNote(noteText)
        setExpanded(false)
      } else {
        toast.error(result.error ?? "Couldn't save the note. Please try again.")
      }
    })
  }

  if (!expanded) {
    return (
      <div className="flex items-center gap-2">
        {displayedNote ? (
          <>
            <span className="text-sm text-muted-foreground">
              {displayedNote.length > 80
                ? displayedNote.slice(0, 80) + '...'
                : displayedNote}
            </span>
            <button
              type="button"
              onClick={handleExpand}
              aria-expanded={false}
              className="text-sm text-primary font-bold"
            >
              Edit note
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleExpand}
            aria-expanded={false}
            className="text-sm text-primary font-bold"
          >
            Add note
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          className="min-h-20 rounded-2xl"
          aria-label={`Progress note for ${playerName}`}
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          maxLength={MAX_NOTE_LENGTH}
          disabled={isPending}
        />
        {showCounter && (
          <p className="text-[10px] text-muted-foreground text-right mt-0.5">
            {charCount}/{MAX_NOTE_LENGTH}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={isPending || noteText.trim().length === 0}
          className="text-sm h-9 rounded-xl"
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              Saving...
            </>
          ) : (
            'Save note'
          )}
        </Button>
        <button
          type="button"
          onClick={handleCancel}
          className="text-sm text-muted-foreground hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
