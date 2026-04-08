'use client'

import { useState } from 'react'
import { Plus, CalendarX } from 'lucide-react'
import { motion } from 'framer-motion'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { EventCard } from './EventCard'
import { AnnouncementCard } from './AnnouncementCard'
import { CreateEventDialog } from './CreateEventDialog'
import type { EventWithRsvpStatus, AnnouncementWithAuthor } from '@/lib/types/events'

interface EventsPageClientProps {
  officialEvents: EventWithRsvpStatus[]
  communityEvents: EventWithRsvpStatus[]
  pastOfficialEvents: EventWithRsvpStatus[]
  pastCommunityEvents: EventWithRsvpStatus[]
  announcements: AnnouncementWithAuthor[]
  userRole: string
  communityId: string
}

function groupByMonth(events: EventWithRsvpStatus[]): { label: string; events: EventWithRsvpStatus[] }[] {
  const groups = new Map<string, EventWithRsvpStatus[]>()
  for (const event of events) {
    const date = new Date(event.starts_at)
    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`
    const label = date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(event)
    // Store label on first item
    if (!groups.get(key)!.length) groups.set(key, [])
    ;(groups.get(key) as unknown as { _label?: string })._label = label
  }
  // Convert to array preserving order
  const result: { label: string; events: EventWithRsvpStatus[] }[] = []
  const seen = new Set<string>()
  for (const event of events) {
    const date = new Date(event.starts_at)
    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`
    if (!seen.has(key)) {
      seen.add(key)
      const label = date.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' })
      result.push({ label, events: groups.get(key)! })
    }
  }
  return result
}

function EventList({ events, emptyMessage }: { events: EventWithRsvpStatus[]; emptyMessage: string }) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CalendarX className="w-8 h-8 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  const grouped = groupByMonth(events)

  return (
    <div className="flex flex-col gap-4">
      {grouped.map((group) => (
        <div key={group.label}>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
            {group.label}
          </p>
          <div className="flex flex-col gap-2">
            {group.events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, 5) * 0.05 }}
              >
                <EventCard event={event} />
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function EventsPageClient({
  officialEvents,
  communityEvents,
  pastOfficialEvents,
  pastCommunityEvents,
  announcements,
  userRole,
  communityId,
}: EventsPageClientProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [isAnnouncement, setIsAnnouncement] = useState(false)
  const [timeFilter, setTimeFilter] = useState<'upcoming' | 'past'>('upcoming')

  function openCreateEvent() {
    setIsAnnouncement(false)
    setCreateOpen(true)
  }

  function openCreateAnnouncement() {
    setIsAnnouncement(true)
    setCreateOpen(true)
  }

  const canPost = userRole === 'admin' || userRole === 'coach'

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-heading font-bold text-2xl text-foreground">Events</h1>
        <button
          type="button"
          onClick={openCreateEvent}
          className="hidden sm:flex h-10 px-4 rounded-xl text-sm font-heading font-bold bg-primary text-primary-foreground items-center gap-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Create Event
        </button>
      </div>

      {/* Upcoming / Past toggle — neutral style to avoid green overload */}
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-muted/50 rounded-2xl p-1 flex gap-1 h-10">
          {(['upcoming', 'past'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setTimeFilter(v)}
              className={`px-4 text-sm rounded-xl h-8 flex items-center transition-all cursor-pointer ${
                timeFilter === v
                  ? 'bg-foreground text-background font-heading font-bold shadow-md'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {v === 'upcoming' ? 'Upcoming' : 'Past'}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs — uses base-ui data-active attribute */}
      <Tabs defaultValue="official">
        <TabsList className="w-full bg-muted/50 rounded-2xl p-1 mb-4 h-12">
          <TabsTrigger
            value="official"
            className="flex-1 rounded-xl h-10 text-sm font-heading font-bold text-muted-foreground transition-all data-active:bg-primary data-active:text-primary-foreground data-active:shadow-md"
          >
            Official
          </TabsTrigger>
          <TabsTrigger
            value="community"
            className="flex-1 rounded-xl h-10 text-sm font-heading font-bold text-muted-foreground transition-all data-active:bg-primary data-active:text-primary-foreground data-active:shadow-md"
          >
            Community
          </TabsTrigger>
        </TabsList>

        {/* Official tab */}
        <TabsContent value="official" className="mt-0">
          {/* Announcements section — only show on upcoming */}
          {timeFilter === 'upcoming' && announcements.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold">
                  ANNOUNCEMENTS
                </span>
                {canPost && (
                  <button
                    type="button"
                    onClick={openCreateAnnouncement}
                    className="text-sm text-primary font-bold"
                  >
                    Post announcement
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {announcements.map((announcement, index) => (
                  <motion.div
                    key={announcement.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <AnnouncementCard
                      announcement={announcement}
                      canEdit={canPost}
                    />
                  </motion.div>
                ))}
              </div>
              <Separator className="my-4" />
            </div>
          )}

          {/* Announcements label when none exist but user can post */}
          {timeFilter === 'upcoming' && announcements.length === 0 && canPost && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold">
                ANNOUNCEMENTS
              </span>
              <button
                type="button"
                onClick={openCreateAnnouncement}
                className="text-sm text-primary font-bold"
              >
                Post announcement
              </button>
            </div>
          )}

          {/* Events section */}
          {timeFilter === 'upcoming' && (
            <div className="mb-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold">
                EVENTS
              </span>
            </div>
          )}
          <EventList
            events={timeFilter === 'upcoming' ? officialEvents : pastOfficialEvents}
            emptyMessage={timeFilter === 'upcoming' ? 'No upcoming official events.' : 'No past official events.'}
          />
        </TabsContent>

        {/* Community tab */}
        <TabsContent value="community" className="mt-0">
          <EventList
            events={timeFilter === 'upcoming' ? communityEvents : pastCommunityEvents}
            emptyMessage={timeFilter === 'upcoming' ? 'No upcoming community events. Be the first to create one!' : 'No past community events.'}
          />
        </TabsContent>
      </Tabs>

      {/* Mobile FAB — all users can create community events */}
      <button
        type="button"
        onClick={openCreateEvent}
        aria-label="Create event"
        className="sm:hidden fixed bottom-20 right-5 z-40 bg-primary text-primary-foreground w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-primary/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Create Event / Announcement Dialog */}
      <CreateEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isAnnouncement={isAnnouncement}
        userRole={userRole}
        communityId={communityId}
      />
    </>
  )
}
