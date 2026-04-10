'use client'

import React, { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, MapPin, CalendarX } from 'lucide-react'
import { motion } from 'framer-motion'
import { InitialsAvatar } from '@/components/profile/InitialsAvatar'

/** Session shape accepted by the calendar grid — includes joined template data and optional user flags */
interface CalendarSession {
  id: string
  scheduled_at: string
  duration_minutes: number
  venue: string
  capacity: number
  cancelled_at?: string | null
  court_number?: string | null
  session_templates?: { title: string } | null
  _userConfirmed?: boolean
  _coachName?: string | null
}

interface AttendeeInfo {
  display_name: string | null
  avatar_url: string | null
}

interface SessionAttendeeData {
  confirmedCount: number
  capacity: number | null
  attendeePreview: AttendeeInfo[]
}

interface CalendarEvent {
  id: string
  title: string
  starts_at: string
  duration_minutes: number | null
  venue: string | null
  event_type: string
}

interface WeekCalendarGridProps {
  sessions: CalendarSession[]
  linkPrefix?: string // e.g. '/coach/sessions' or '/sessions'
  initialDate?: string
  loading?: boolean
  attendeeData?: Record<string, SessionAttendeeData>
  events?: CalendarEvent[]
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
  const period = hour >= 12 ? 'pm' : 'am'
  const h = hour % 12 === 0 ? 12 : hour % 12
  if (minute === 0) return `${h}${period}`
  return `${h}:${minute}${period}`
}

function formatTimeShort(isoString: string): string {
  const d = new Date(isoString)
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(d)
  const h = Number(parts.find(p => p.type === 'hour')?.value ?? 0)
  const m = parts.find(p => p.type === 'minute')?.value ?? '00'
  const period = (parts.find(p => p.type === 'dayPeriod')?.value ?? 'am').toUpperCase()
  const min = m === '00' ? '' : `:${m}`
  return `${h}${min}${period}`
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', weekday: 'short', day: 'numeric', month: 'short' })
}

// Grid starts at 6:00am, rows are 30-min increments
const GRID_START_HOUR = 6
const GRID_END_HOUR = 22 // exclusive; row 2 + (22-6)*2 = row 34
const TOTAL_TIME_ROWS = (GRID_END_HOUR - GRID_START_HOUR) * 2 // 32 rows

function sydneyHourMin(d: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  return {
    hour: Number(parts.find(p => p.type === 'hour')?.value ?? 0),
    minute: Number(parts.find(p => p.type === 'minute')?.value ?? 0),
  }
}

function getGridRowFraction(isoString: string): number {
  const { hour, minute } = sydneyHourMin(new Date(isoString))
  // Returns fractional row position for precise placement
  return 2 + (hour - GRID_START_HOUR) * 2 + (minute / 30)
}

function getEndTimeIso(isoString: string, durationMinutes: number): string {
  // Adding minutes to a UTC timestamp is timezone-safe (no DST boundary issues)
  return new Date(new Date(isoString).getTime() + durationMinutes * 60000).toISOString()
}

function formatTimeRange(startIso: string, durationMinutes: number): string {
  const start = formatTimeShort(startIso)
  const end = formatTimeShort(getEndTimeIso(startIso, durationMinutes))
  return `${start} – ${end}`
}

// Overlap detection: assign column index and total columns for side-by-side rendering
interface CalendarBlock {
  id: string
  startMin: number // minutes from midnight
  endMin: number
  type: 'session' | 'event'
  col?: number
  totalCols?: number
}

function assignColumns(blocks: CalendarBlock[]): CalendarBlock[] {
  if (blocks.length === 0) return blocks
  // Sort by start time, then by duration (longer first)
  const sorted = [...blocks].sort((a, b) => a.startMin - b.startMin || (b.endMin - b.startMin) - (a.endMin - a.startMin))

  // Greedy column assignment
  const columns: CalendarBlock[][] = []
  for (const block of sorted) {
    let placed = false
    for (let c = 0; c < columns.length; c++) {
      const lastInCol = columns[c][columns[c].length - 1]
      if (lastInCol.endMin <= block.startMin) {
        columns[c].push(block)
        block.col = c
        placed = true
        break
      }
    }
    if (!placed) {
      block.col = columns.length
      columns.push([block])
    }
  }

  // Compute totalCols for each overlapping group
  // A group is blocks that transitively overlap
  for (const block of sorted) {
    const overlapping = sorted.filter(
      b => b.startMin < block.endMin && b.endMin > block.startMin
    )
    const maxCol = Math.max(...overlapping.map(b => (b.col ?? 0) + 1))
    for (const b of overlapping) {
      b.totalCols = Math.max(b.totalCols ?? 1, maxCol)
    }
  }

  return sorted
}

function toMinutes(isoString: string): number {
  const { hour, minute } = sydneyHourMin(new Date(isoString))
  return hour * 60 + minute
}

import { EVENT_TYPE_COLORS, EVENT_TYPE_HEX } from '@/lib/constants/events'

function getEventColors(eventType: string) {
  return EVENT_TYPE_COLORS[eventType] ?? EVENT_TYPE_COLORS.social
}

function getEventHex(eventType: string) {
  return EVENT_TYPE_HEX[eventType] ?? EVENT_TYPE_HEX.social
}

function isSameDay(a: Date, b: Date): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' })
  return fmt.format(a) === fmt.format(b)
}

// Generate time labels for the left column
const TIME_LABELS: string[] = []
for (let h = GRID_START_HOUR; h < GRID_END_HOUR; h++) {
  TIME_LABELS.push(formatTime(h, 0))
  TIME_LABELS.push(formatTime(h, 30))
}

export function WeekCalendarGrid({ sessions, linkPrefix = '/coach/sessions', initialDate, loading = false, attendeeData = {}, events = [] }: WeekCalendarGridProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    if (initialDate) return getWeekStart(new Date(initialDate))
    return getWeekStart(new Date())
  })

  // Defer rendering until client-side to avoid hydration mismatches from Date/localStorage
  const [mounted, setMounted] = useState(false)
  const [view, setView] = useState<'day' | 'week'>('week')
  const [hideCancelled, setHideCancelled] = useState(false)
  useEffect(() => {
    const saved = localStorage.getItem('tennis-schedule-view')
    if (saved === 'day' || saved === 'week') setView(saved)
    const savedHide = localStorage.getItem('tennis-hide-cancelled')
    if (savedHide === 'true') setHideCancelled(true)
    setMounted(true)
  }, [])

  const handleViewChange = (v: 'day' | 'week') => {
    setView(v)
    localStorage.setItem('tennis-schedule-view', v)
  }

  const handleHideCancelledChange = () => {
    const next = !hideCancelled
    setHideCancelled(next)
    localStorage.setItem('tennis-hide-cancelled', String(next))
  }

  // Filter cancelled sessions if toggle is on
  const filteredSessions = hideCancelled
    ? sessions.filter(s => s.cancelled_at === null || s.cancelled_at === undefined)
    : sessions

  // Day view: selected date state
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i))
  }, [currentWeekStart])

  const sessionsByDay = useMemo(() => {
    const map = new Map<number, CalendarSession[]>()
    for (let i = 0; i < 7; i++) map.set(i, [])

    for (const session of filteredSessions) {
      const sessionDate = new Date(session.scheduled_at)
      for (let i = 0; i < 7; i++) {
        if (isSameDay(sessionDate, weekDays[i])) {
          map.get(i)!.push(session)
          break
        }
      }
    }
    return map
  }, [filteredSessions, weekDays])

  const goToPrevWeek = () => setCurrentWeekStart(d => addDays(d, -7))
  const goToNextWeek = () => setCurrentWeekStart(d => addDays(d, 7))
  const goToToday = () => setCurrentWeekStart(getWeekStart(new Date()))

  const today = new Date()

  // Check if any sessions in current week
  const hasSessionsThisWeek = useMemo(
    () => Array.from(sessionsByDay.values()).some(arr => arr.length > 0),
    [sessionsByDay]
  )

  // Day view: sessions for selected date
  const dayViewSessions = useMemo(() => {
    return filteredSessions
      .filter(s => isSameDay(new Date(s.scheduled_at), selectedDate))
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
  }, [filteredSessions, selectedDate])

  // Day view: events for selected date
  const dayViewEvents = useMemo(() => {
    return events
      .filter(e => isSameDay(new Date(e.starts_at), selectedDate))
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
  }, [events, selectedDate])

  // Week view: events by day
  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>()
    for (let i = 0; i < 7; i++) map.set(i, [])
    for (const event of events) {
      const eventDate = new Date(event.starts_at)
      for (let i = 0; i < 7; i++) {
        if (isSameDay(eventDate, weekDays[i])) {
          map.get(i)!.push(event)
          break
        }
      }
    }
    return map
  }, [events, weekDays])

  if (loading || !mounted) {
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
                  {col > 0 && row % 4 === 0 && (col + row) % 3 === 0 && (
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
      {/* View toggle pill + hide cancelled */}
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-muted/50 rounded-2xl p-1 flex gap-1 h-10">
          {(['day', 'week'] as const).map((v) => (
            <button
              key={v}
              onClick={() => handleViewChange(v)}
              className={`px-4 text-sm rounded-xl h-8 flex items-center transition-all cursor-pointer ${
                view === v
                  ? 'bg-primary text-primary-foreground font-heading font-bold shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v === 'day' ? 'Day' : 'Week'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleHideCancelledChange}
          className={`text-xs px-3 py-1.5 rounded-full transition-all cursor-pointer ${
            hideCancelled
              ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold'
              : 'bg-muted/50 text-muted-foreground hover:text-foreground'
          }`}
        >
          {hideCancelled ? 'Cancelled hidden' : 'Hide cancelled'}
        </button>
      </div>

      {view === 'day' ? (
        /* DAY VIEW */
        <div className="flex flex-col">
          {/* Date navigation row */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setSelectedDate(d => addDays(d, -1))}
              className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4 text-foreground" />
            </button>
            <span className="font-heading font-bold text-base">
              {formatDayLabel(selectedDate)}
            </span>
            <button
              onClick={() => setSelectedDate(d => addDays(d, 1))}
              className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4 text-foreground" />
            </button>
          </div>

          {/* Session + Event list */}
          {dayViewSessions.length === 0 && dayViewEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarX className="w-8 h-8 text-muted mb-3" />
              <p className="text-sm text-muted-foreground">Nothing scheduled for this day.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {dayViewSessions.map((session, index) => {
                const sessionAttendees = attendeeData[session.id]
                const confirmedCount = sessionAttendees?.confirmedCount ?? 0
                const capacity = sessionAttendees?.capacity ?? session.capacity
                const attendeePreview = sessionAttendees?.attendeePreview ?? []
                const isCancelled = session.cancelled_at !== null
                const title = session.session_templates?.title ?? ''

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={`${linkPrefix}/${session.id}`}
                      className={`block bg-card rounded-3xl border border-border/50 p-4 active:scale-[0.98] transition-transform cursor-pointer ${
                        isCancelled ? 'opacity-60' : ''
                      }`}
                    >
                      {/* Top row: time range + capacity */}
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-foreground">
                          {formatTimeRange(session.scheduled_at, session.duration_minutes)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {confirmedCount}/{capacity}
                        </span>
                      </div>

                      {/* Title */}
                      <p className={`font-heading font-bold text-base mb-1 ${isCancelled ? 'line-through' : ''}`}>
                        {title || formatTimeShort(session.scheduled_at)}
                      </p>

                      {/* Venue */}
                      {session.venue && (
                        <div className="flex items-center gap-1 mb-0.5">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {session.venue}{session.court_number ? ` · Court No.${session.court_number}` : ''}
                          </span>
                        </div>
                      )}

                      {/* Coach name */}
                      {session._coachName && (
                        <p className="text-[10px] text-muted-foreground mb-3">
                          Coach: {session._coachName}
                        </p>
                      )}

                      {/* Attendee avatar strip */}
                      {attendeePreview.length > 0 && (
                        <div className="flex -space-x-1">
                          {attendeePreview.slice(0, 5).map((attendee, i) => (
                            <div key={i} className="w-6 h-6 rounded-full ring-2 ring-background overflow-hidden">
                              {attendee.avatar_url ? (
                                <Image
                                  src={attendee.avatar_url}
                                  width={24}
                                  height={24}
                                  alt={attendee.display_name ?? ''}
                                  className="w-full h-full object-cover"
                                  unoptimized
                                />
                              ) : (
                                <InitialsAvatar
                                  name={attendee.display_name ?? '?'}
                                  size={24}
                                  className="rounded-full"
                                />
                              )}
                            </div>
                          ))}
                          {confirmedCount > 5 && (
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground ring-2 ring-background">
                              +{confirmedCount - 5}
                            </div>
                          )}
                        </div>
                      )}
                    </Link>
                  </motion.div>
                )
              })}
              {/* Event cards in day view */}
              {dayViewEvents.map((evt, index) => {
                const duration = evt.duration_minutes ?? 60
                const hex = getEventHex(evt.event_type)
                return (
                  <motion.div
                    key={evt.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (dayViewSessions.length + index) * 0.05 }}
                  >
                    <Link
                      href={`/events/${evt.id}`}
                      className="block rounded-3xl p-4 active:scale-[0.98] transition-transform cursor-pointer"
                      style={{ backgroundColor: hex.bg, borderWidth: 1, borderColor: hex.border }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-bold text-foreground">
                          {formatTimeRange(evt.starts_at, duration)}
                        </span>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                          style={{ color: hex.text, backgroundColor: hex.border }}
                        >
                          {evt.event_type === 'tournament' ? 'Tournament' : evt.event_type === 'social' ? 'Social' : 'Open'}
                        </span>
                      </div>
                      <p className="font-heading font-bold text-base mb-1">{evt.title}</p>
                      {evt.venue && (
                        <div className="flex items-center gap-1 mb-1">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{evt.venue}</span>
                        </div>
                      )}
                    </Link>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        /* WEEK VIEW */
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
                {currentWeekStart.toLocaleDateString('en-AU', { timeZone: 'Australia/Sydney', month: 'long', year: 'numeric' })}
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
              className="min-w-[640px] relative bg-background"
              style={{
                display: 'grid',
                gridTemplateColumns: '72px repeat(7, 1fr)',
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

              {/* Combined session + event blocks with overlap detection */}
              {weekDays.map((_, colIdx) => {
                const daySessions = sessionsByDay.get(colIdx) ?? []
                const dayEvents = eventsByDay.get(colIdx) ?? []

                // Build unified block list for overlap detection
                const blocks: CalendarBlock[] = [
                  ...daySessions.map(s => ({
                    id: s.id,
                    startMin: toMinutes(s.scheduled_at),
                    endMin: toMinutes(s.scheduled_at) + s.duration_minutes,
                    type: 'session' as const,
                  })),
                  ...dayEvents.map(e => ({
                    id: e.id,
                    startMin: toMinutes(e.starts_at),
                    endMin: toMinutes(e.starts_at) + (e.duration_minutes ?? 60),
                    type: 'event' as const,
                  })),
                ]

                const positioned = assignColumns(blocks)
                const blockMap = new Map(positioned.map(b => [b.id, b]))

                const ROW_HEIGHT = 48
                const HEADER_HEIGHT = 40

                return (
                  <React.Fragment key={`blocks-${colIdx}`}>
                    {/* Session blocks */}
                    {daySessions.map((session) => {
                      const block = blockMap.get(session.id)
                      const col = block?.col ?? 0
                      const totalCols = block?.totalCols ?? 1
                      const startFrac = getGridRowFraction(session.scheduled_at)
                      const topPx = HEADER_HEIGHT + (startFrac - 2) * ROW_HEIGHT
                      const durationRows = session.duration_minutes / 30
                      const heightPx = durationRows * ROW_HEIGHT
                      const isCancelled = session.cancelled_at !== null
                      const isUserConfirmed = session._userConfirmed !== false
                      const sessionAttendees = attendeeData[session.id]
                      const confirmedCount = sessionAttendees?.confirmedCount
                      const sessionCapacity = sessionAttendees?.capacity ?? session.capacity
                      const hasUserTag = '_userConfirmed' in session
                      const isNotAttending = hasUserTag && !isUserConfirmed

                      return (
                        <div
                          key={session.id}
                          style={{
                            position: 'absolute',
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                            left: `calc((100% - 72px) / 7 * ${colIdx} + 72px + ((100% - 72px) / 7 - 4px) * ${col} / ${totalCols} + 2px)`,
                            width: `calc(((100% - 72px) / 7 - 4px) / ${totalCols})`,
                            zIndex: 5,
                            padding: '1px',
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
                                {session.session_templates?.title || formatTimeShort(session.scheduled_at)}
                            </div>
                            <div className="truncate leading-tight opacity-80 text-[11px]">
                              {formatTimeRange(session.scheduled_at, session.duration_minutes)}
                            </div>
                            {durationRows > 1 && session._coachName && (
                              <div className="truncate leading-tight opacity-70 text-[11px]">
                                {session._coachName}
                              </div>
                            )}
                            {durationRows > 2 && (
                              <div className="truncate leading-tight opacity-70 text-[11px]">
                                {session.venue}{session.court_number ? ` · Court No.${session.court_number}` : ''}
                              </div>
                            )}
                            {confirmedCount !== undefined && (
                              <div className="text-[10px] text-muted-foreground mt-0.5 opacity-90">
                                {confirmedCount}/{sessionCapacity}
                              </div>
                            )}
                          </Link>
                        </div>
                      )
                    })}

                    {/* Event blocks */}
                    {dayEvents.map((evt) => {
                      const block = blockMap.get(evt.id)
                      const col = block?.col ?? 0
                      const totalCols = block?.totalCols ?? 1
                      const duration = evt.duration_minutes ?? 60
                      const startFrac = getGridRowFraction(evt.starts_at)
                      const topPx = HEADER_HEIGHT + (startFrac - 2) * ROW_HEIGHT
                      const heightPx = (duration / 30) * ROW_HEIGHT
                      const evtColors = getEventColors(evt.event_type)

                      return (
                        <div
                          key={evt.id}
                          style={{
                            position: 'absolute',
                            top: `${topPx}px`,
                            height: `${heightPx}px`,
                            left: `calc((100% - 72px) / 7 * ${colIdx} + 72px + ((100% - 72px) / 7 - 4px) * ${col} / ${totalCols} + 2px)`,
                            width: `calc(((100% - 72px) / 7 - 4px) / ${totalCols})`,
                            zIndex: 4,
                            padding: '1px',
                          }}
                        >
                          <Link
                            href={`/events/${evt.id}`}
                            className="block h-full w-full rounded-lg text-[13px] p-1 overflow-hidden cursor-pointer transition-opacity hover:opacity-90 text-white"
                            style={{ backgroundColor: evtColors.blockHex }}
                          >
                            <div className="font-medium truncate leading-tight">
                              {evt.title}
                            </div>
                            <div className="truncate leading-tight opacity-80 text-[11px]">
                              {formatTimeRange(evt.starts_at, duration)}
                            </div>
                            {(duration / 30) > 1 && evt.venue && (
                              <div className="truncate leading-tight opacity-70 text-[11px]">
                                {evt.venue}
                              </div>
                            )}
                          </Link>
                        </div>
                      )
                    })}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
