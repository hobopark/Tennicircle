'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Session } from '@/lib/types/sessions'

interface WeekCalendarGridProps {
  sessions: Session[]
  linkPrefix?: string // e.g. '/coach/sessions' or '/sessions'
  initialDate?: string
  loading?: boolean
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Returns the Monday of the week containing the given date
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  // getDay(): 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM'
  const h = hour % 12 === 0 ? 12 : hour % 12
  const m = minute === 0 ? '00' : '30'
  return `${h}:${m} ${period}`
}

function formatTimeShort(isoString: string): string {
  const d = new Date(isoString)
  const h = d.getHours()
  const m = d.getMinutes()
  const period = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 === 0 ? 12 : h % 12
  const min = m === 0 ? '' : `:${String(m).padStart(2, '0')}`
  return `${hr}${min}${period}`
}

// Grid starts at 6:00am, rows are 30-min increments
const GRID_START_HOUR = 6
const GRID_END_HOUR = 22 // exclusive; row 2 + (22-6)*2 = row 34
const TOTAL_TIME_ROWS = (GRID_END_HOUR - GRID_START_HOUR) * 2 // 32 rows

function getGridRow(isoString: string): number {
  const d = new Date(isoString)
  const hour = d.getHours()
  const minutes = d.getMinutes()
  return 2 + (hour - GRID_START_HOUR) * 2 + (minutes >= 30 ? 1 : 0)
}

function getGridRowSpan(durationMinutes: number): number {
  return Math.max(1, Math.ceil(durationMinutes / 30))
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// Generate time labels for the left column
const TIME_LABELS: string[] = []
for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h++) {
  TIME_LABELS.push(formatTime(h, 0))
  TIME_LABELS.push(formatTime(h, 30))
}

export function WeekCalendarGrid({ sessions, linkPrefix = '/coach/sessions', initialDate, loading = false }: WeekCalendarGridProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    if (initialDate) return getWeekStart(new Date(initialDate))
    return getWeekStart(new Date())
  })

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  }, [currentWeekStart])

  const sessionsByDay = useMemo(() => {
    const map = new Map<number, Session[]>()
    for (let i = 0; i < 7; i++) map.set(i, [])

    for (const session of sessions) {
      const sessionDate = new Date(session.scheduled_at)
      for (let i = 0; i < 7; i++) {
        if (isSameDay(sessionDate, weekDays[i])) {
          map.get(i)!.push(session)
          break
        }
      }
    }
    return map
  }, [sessions, weekDays])

  const goToPrevWeek = () => setCurrentWeekStart(d => addDays(d, -7))
  const goToNextWeek = () => setCurrentWeekStart(d => addDays(d, 7))
  const goToToday = () => setCurrentWeekStart(getWeekStart(new Date()))

  const today = new Date()

  // Check if any sessions in current week
  const hasSessionsThisWeek = useMemo(
    () => Array.from(sessionsByDay.values()).some(arr => arr.length > 0),
    [sessionsByDay]
  )

  if (loading) {
    return (
      <div className="w-full overflow-x-auto rounded-lg border border-border">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-8 gap-px bg-border">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-muted h-10 animate-pulse" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, row) => (
            <div key={row} className="grid grid-cols-8 gap-px bg-border">
              {Array.from({ length: 8 }).map((_, col) => (
                <div key={col} className={`bg-card h-12 ${col > 0 && row % 4 === 0 ? 'relative' : ''}`}>
                  {col > 0 && row % 4 === 0 && Math.random() > 0.7 && (
                    <div className="absolute inset-1 bg-muted animate-pulse rounded" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Empty state */}
      {!hasSessionsThisWeek && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <h2 className="text-[20px] font-bold text-foreground mb-2">Your schedule is clear</h2>
          <p className="text-base text-muted-foreground mb-4">Create a recurring session to get started.</p>
          <Link
            href="/coach/sessions/new"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            Create session
          </Link>
        </div>
      )}

      {/* Navigation — directly above the grid */}
      <div className="flex items-center gap-1.5 mb-2">
        <button
          onClick={goToPrevWeek}
          className="p-1 rounded-md hover:bg-muted transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>
        <button
          onClick={goToNextWeek}
          className="p-1 rounded-md hover:bg-muted transition-colors"
          aria-label="Next week"
        >
          <ChevronRight className="w-4 h-4 text-foreground" />
        </button>
        <button
          onClick={goToToday}
          className="px-2.5 py-0.5 text-sm rounded-md border border-border hover:bg-muted transition-colors text-foreground"
        >
          Today
        </button>
        <div className="relative ml-1.5">
          <button
            onClick={() => {
              const picker = document.getElementById('week-date-picker') as HTMLInputElement
              picker?.showPicker()
            }}
            className="text-sm text-muted-foreground hover:text-foreground cursor-pointer hover:underline"
          >
            {currentWeekStart.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })}
          </button>
          <input
            id="week-date-picker"
            type="date"
            className="absolute inset-0 opacity-0 w-0 h-0"
            onChange={(e) => {
              if (e.target.value) {
                setCurrentWeekStart(getWeekStart(new Date(e.target.value + 'T12:00:00')))
              }
            }}
          />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="w-full overflow-x-auto rounded-lg border border-border">
        {/* Desktop: 7 columns; Mobile: 3 columns */}
        <div
          className="min-w-[600px] relative bg-background"
          style={{
            display: 'grid',
            gridTemplateColumns: '60px repeat(7, 1fr)',
            gridTemplateRows: `40px repeat(${TOTAL_TIME_ROWS}, 48px)`,
          }}
        >
          {/* Header row — sticky */}
          {/* Time label header cell */}
          <div
            className="bg-muted border-b border-r border-border sticky top-0 z-10"
            style={{ gridColumn: 1, gridRow: 1 }}
          />
          {/* Day header cells */}
          {weekDays.map((day, i) => (
            <div
              key={i}
              className="bg-muted border-b border-r border-border sticky top-0 z-10 flex flex-col items-center justify-center"
              style={{ gridColumn: i + 2, gridRow: 1 }}
            >
              <span className={`text-[14px] font-normal ${isSameDay(day, today) ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                {DAY_NAMES[i]}
              </span>
              <span className={`text-[14px] font-normal ${isSameDay(day, today) ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                {day.getDate()}
              </span>
            </div>
          ))}

          {/* Time label cells */}
          {TIME_LABELS.map((label, rowIdx) => (
            <div
              key={`time-${rowIdx}`}
              className="border-b border-r border-border flex items-start pt-1 pr-2 justify-end bg-background"
              style={{ gridColumn: 1, gridRow: rowIdx + 2 }}
            >
              {rowIdx % 2 === 0 && (
                <span className="text-[12px] text-muted-foreground leading-none">{label}</span>
              )}
            </div>
          ))}

          {/* Day column background cells */}
          {weekDays.map((_, colIdx) =>
            TIME_LABELS.map((_, rowIdx) => (
              <div
                key={`cell-${colIdx}-${rowIdx}`}
                className={`border-b border-r border-border bg-card ${rowIdx % 2 === 0 ? '' : 'border-b-border/50'}`}
                style={{ gridColumn: colIdx + 2, gridRow: rowIdx + 2 }}
              />
            ))
          )}

          {/* Session blocks */}
          {weekDays.map((day, colIdx) => {
            const daySessions = sessionsByDay.get(colIdx) ?? []
            return daySessions.map((session) => {
              const gridRow = getGridRow(session.scheduled_at)
              const rowSpan = getGridRowSpan(session.duration_minutes)
              const isCancelled = session.cancelled_at !== null
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const isUserConfirmed = (session as any)._userConfirmed !== false // true if not tagged (coach view) or explicitly confirmed

              // Get RSVP count if available (sessions may have session_rsvps count from query)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const rsvpCountArr = (session as any).session_rsvps
              const attendeeCount = Array.isArray(rsvpCountArr)
                ? (rsvpCountArr[0] as { count: number } | undefined)?.count ?? 0
                : 0

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const hasUserTag = '_userConfirmed' in (session as any)
              const isNotAttending = hasUserTag && !isUserConfirmed

              return (
                <div
                  key={session.id}
                  style={{
                    gridColumn: colIdx + 2,
                    gridRow: `${gridRow} / span ${rowSpan}`,
                    zIndex: 5,
                    padding: '2px',
                  }}
                >
                  <Link
                    href={`${linkPrefix}/${session.id}`}
                    className={`block h-full w-full rounded-lg text-[13px] p-1 overflow-hidden cursor-pointer transition-opacity hover:opacity-90 ${
                      isCancelled
                        ? 'bg-muted text-muted-foreground'
                        : isNotAttending
                        ? 'bg-primary/15 text-primary border-2 border-dashed border-primary/40'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    <div className={`font-medium truncate leading-tight ${isCancelled ? 'line-through' : ''}`}>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {(session as any).session_templates?.title || formatTimeShort(session.scheduled_at)}
                    </div>
                    <div className="truncate leading-tight opacity-80">
                      {formatTimeShort(session.scheduled_at)}
                    </div>
                    {rowSpan > 1 && (
                      <div className="truncate leading-tight opacity-70 text-[11px]">
                        {session.venue}{session.court_number ? ` · Court No.${session.court_number}` : ''}
                      </div>
                    )}
                    {rowSpan > 2 && attendeeCount > 0 && (
                      <div className="text-[11px] opacity-75 mt-0.5">
                        {attendeeCount} / {session.capacity}
                      </div>
                    )}
                  </Link>
                </div>
              )
            })
          })}
        </div>
      </div>
    </div>
  )
}
