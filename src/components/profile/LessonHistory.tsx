'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { getLessonHistory } from '@/lib/actions/profiles'
import { ProgressNoteForm } from '@/components/profile/ProgressNoteForm'
import type { LessonHistoryEntry } from '@/lib/types/profiles'

interface LessonHistoryProps {
  initialEntries: LessonHistoryEntry[]
  communityId: string
  memberId: string
  isCoachViewing: boolean
  totalCount: number
}

function formatSessionDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate))
}

function formatSessionTime(isoDate: string, durationMinutes: number): string {
  const time = new Intl.DateTimeFormat('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(new Date(isoDate))
    .toUpperCase()
  return `${time} · ${durationMinutes} min`
}

export function LessonHistory({
  initialEntries,
  communityId,
  memberId,
  isCoachViewing,
  totalCount,
}: LessonHistoryProps) {
  const [entries, setEntries] = useState<LessonHistoryEntry[]>(initialEntries)
  const [isPending, startTransition] = useTransition()

  function handleLoadMore() {
    startTransition(async () => {
      const result = await getLessonHistory(communityId, memberId, 20, entries.length)
      if (result.success && result.data) {
        setEntries(prev => [...prev, ...result.data!.entries])
      }
    })
  }

  const now = new Date().toISOString()
  const futureEntries = entries.filter(e => e.scheduled_at >= now).sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )
  const pastEntries = entries.filter(e => e.scheduled_at < now).sort(
    (a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
  )

  return (
    <div className="flex flex-col gap-3">
      {entries.length === 0 ? (
        <div className="bg-card rounded-3xl border border-border/50 p-6 text-center">
          <p className="font-heading font-bold text-base mb-2">No sessions yet</p>
          <p className="text-sm text-muted-foreground">
            {isCoachViewing
              ? 'No sessions recorded for this player yet.'
              : "Your session history will appear here once you've attended your first session."}
          </p>
        </div>
      ) : (
        <>
          {/* Upcoming Lessons */}
          {futureEntries.length > 0 && (
            <div className="mb-6">
              <h2 className="font-heading font-bold text-base mb-3 text-primary">Upcoming Lessons</h2>
              <ul className="flex flex-col gap-3">
                {futureEntries.map((entry, index) => {
                  const coachNames = entry.coaches.map(c => c.display_name).join(', ')
                  return (
                    <li
                      key={entry.rsvp_id}
                      className="animate-fade-in-up bg-primary/5 rounded-3xl border border-primary/20 p-4"
                      style={{ animationDelay: `${Math.min(index, 5) * 0.05}s` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-foreground">
                          {formatSessionDate(entry.scheduled_at)}
                        </p>
                        <p className="text-sm text-muted-foreground shrink-0">
                          {formatSessionTime(entry.scheduled_at, entry.duration_minutes)}
                        </p>
                      </div>
                      {entry.venue && (
                        <p className="text-sm text-muted-foreground mt-0.5">{entry.venue}</p>
                      )}
                      {entry.coaches.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-0.5">with {coachNames}</p>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Lesson History */}
          <h2 className="font-heading font-bold text-base mb-3 text-muted-foreground">Lesson History</h2>
          {pastEntries.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {pastEntries.map((entry, index) => {
                const coachNames = entry.coaches.map(c => c.display_name).join(', ')
                return (
                  <li
                    key={entry.rsvp_id}
                    className="animate-fade-in-up bg-card rounded-3xl border border-border/50 p-4 active:scale-[0.98] transition-transform cursor-pointer"
                    style={{ animationDelay: `${Math.min(index, 5) * 0.05}s` }}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-foreground">
                          {formatSessionDate(entry.scheduled_at)}
                        </p>
                        <p className="text-sm text-muted-foreground shrink-0">
                          {formatSessionTime(entry.scheduled_at, entry.duration_minutes)}
                        </p>
                      </div>
                      {entry.venue && (
                        <p className="text-sm text-muted-foreground mt-0.5">{entry.venue}</p>
                      )}
                      {entry.coaches.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-0.5">with {coachNames}</p>
                      )}

                      {/* Inline progress notes */}
                      {entry.progress_notes.length > 0 &&
                        entry.progress_notes.map((note, noteIndex) => (
                          <div key={noteIndex} className="bg-muted rounded-2xl p-3 mt-2">
                            <p className="text-[10px] text-muted-foreground mb-1">{note.coach_name}</p>
                            <p className="text-sm text-foreground">{note.note_text}</p>
                          </div>
                        ))}

                      {/* Progress note form for coach view */}
                      {isCoachViewing && (
                        <div className="mt-2">
                          <ProgressNoteForm
                            sessionId={entry.session_id}
                            subjectMemberId={memberId}
                            playerName=""
                            existingNote={
                              entry.progress_notes.length > 0
                                ? { note_text: entry.progress_notes[0].note_text }
                                : null
                            }
                          />
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          ) : (
            <div className="bg-card rounded-3xl border border-border/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">No past lessons yet.</p>
            </div>
          )}
        </>
      )}

      {entries.length < totalCount && (
        <button
          type="button"
          onClick={handleLoadMore}
          disabled={isPending}
          className="text-sm text-primary hover:underline self-center mt-2 flex items-center gap-1"
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin" size={14} />
              Loading...
            </>
          ) : (
            'Load more'
          )}
        </button>
      )}
    </div>
  )
}
