'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
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
  announcements: AnnouncementWithAuthor[]
  userRole: string
  communityId: string
}

export function EventsPageClient({
  officialEvents,
  communityEvents,
  announcements,
  userRole,
  communityId,
}: EventsPageClientProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [isAnnouncement, setIsAnnouncement] = useState(false)

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
          className="hidden sm:flex h-10 px-4 rounded-xl text-sm font-heading font-bold bg-primary text-primary-foreground items-center gap-2"
        >
          Create Event
        </button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="official">
        <TabsList className="w-full bg-transparent border-b border-border/50 rounded-none p-0 mb-4 h-auto">
          <TabsTrigger
            value="official"
            className="flex-1 rounded-none border-b-2 border-transparent pb-2 text-muted-foreground font-heading font-bold text-sm data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Official
          </TabsTrigger>
          <TabsTrigger
            value="community"
            className="flex-1 rounded-none border-b-2 border-transparent pb-2 text-muted-foreground font-heading font-bold text-sm data-[state=active]:text-primary data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            Community
          </TabsTrigger>
        </TabsList>

        {/* Official tab */}
        <TabsContent value="official" className="mt-0">
          {/* Announcements section */}
          {announcements.length > 0 && (
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
              <div className="flex flex-col gap-3">
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
          {announcements.length === 0 && canPost && (
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
          <div className="mb-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-bold">
              EVENTS
            </span>
          </div>
          {officialEvents.length > 0 ? (
            <div className="flex flex-col gap-3">
              {officialEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <EventCard event={event} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No official events yet.</p>
            </div>
          )}
        </TabsContent>

        {/* Community tab */}
        <TabsContent value="community" className="mt-0">
          {communityEvents.length > 0 ? (
            <div className="flex flex-col gap-3">
              {communityEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <EventCard event={event} />
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">No community events yet. Be the first to create one!</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Mobile FAB */}
      <button
        type="button"
        onClick={openCreateEvent}
        aria-label="Create event"
        className="sm:hidden fixed bottom-20 right-5 z-40 bg-primary text-primary-foreground w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-primary/20"
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
