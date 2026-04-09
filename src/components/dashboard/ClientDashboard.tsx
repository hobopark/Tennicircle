'use client'

import Link from 'next/link'
import { ChevronRight, MapPin, Calendar, User } from 'lucide-react'
import { motion } from 'framer-motion'
import { AnnouncementCard } from '@/components/events/AnnouncementCard'
import type { AnnouncementWithAuthor, EventWithRsvpStatus } from '@/lib/types/events'
import { formatSessionDateTime, formatEventDate } from '@/lib/utils/dates'
import { EVENT_TYPE_BADGE } from '@/lib/constants/events'

interface UpcomingSession {
  id: string
  title: string | null
  scheduled_at: string
  duration_minutes: number | null
  venue: string | null
  capacity: number | null
  confirmed_count: number
  rsvp_type: string
  waitlist_position: number | null
  template_title: string | null
  coach_name?: string | null
}

interface ClientDashboardStats {
  sessionsThisMonth: number
  upcomingRsvps: number
  memberSince: string
}

interface ClientDashboardProps {
  firstName: string
  displayName: string
  stats: ClientDashboardStats
  upcomingSessions: UpcomingSession[]
  upcomingEvents: EventWithRsvpStatus[]
  announcements: AnnouncementWithAuthor[]
  userRole: string
}

export function ClientDashboard({
  firstName,
  displayName,
  stats,
  upcomingSessions,
  upcomingEvents,
  announcements,
  userRole,
}: ClientDashboardProps) {
  return (
    <div className="px-5 pt-14 pb-24 max-w-[640px] mx-auto">
      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0 * 0.08 }}
      >
        <p className="text-sm text-muted-foreground">G&apos;day, {firstName}</p>
        <h1 className="font-heading font-bold text-2xl text-foreground mb-6">
          {displayName}&apos;s Dashboard
        </h1>
      </motion.div>

      {/* Quick stats strip */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 * 0.08 }}
        className="grid grid-cols-3 gap-3 mb-6"
      >
        <div className="bg-primary/10 rounded-2xl border border-primary/20 p-4 text-center">
          <p className="font-heading font-bold text-2xl text-primary">{stats.sessionsThisMonth}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Sessions this month</p>
        </div>
        <div className="bg-emerald-500/10 rounded-2xl border border-emerald-500/20 p-4 text-center">
          <p className="font-heading font-bold text-2xl text-emerald-600 dark:text-emerald-400">{stats.upcomingRsvps}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Upcoming RSVPs</p>
        </div>
        <div className="bg-amber-500/10 rounded-2xl border border-amber-500/20 p-4 text-center">
          <p className="font-heading font-bold text-2xl text-amber-600 dark:text-amber-400">{stats.memberSince}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Member since</p>
        </div>
      </motion.div>

      {/* Upcoming Sessions */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2 * 0.08 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold text-base">Upcoming Sessions</h2>
          <Link href="/sessions/calendar" className="text-sm text-primary flex items-center gap-1">
            Calendar <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {upcomingSessions.length > 0 ? (
          <div className="flex flex-col gap-3">
            {upcomingSessions.map(session => (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className="bg-card rounded-3xl border border-border/50 p-4 active:scale-[0.98] transition-transform cursor-pointer block"
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-heading font-bold text-base">
                    {session.template_title ?? session.title}
                  </h3>
                  <span className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full ml-2 flex-shrink-0">
                    {session.rsvp_type === 'confirmed' ? 'Going' : 'Waitlisted'}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  <span>{formatSessionDateTime(session.scheduled_at)}</span>
                </div>
                {session.venue && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span>{session.venue}</span>
                  </div>
                )}
                {session.coach_name && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                    <User className="w-3 h-3 flex-shrink-0" />
                    <span>{session.coach_name}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-3xl border border-border/50 p-6 text-center">
            <p className="font-heading font-bold text-base mb-1">No sessions scheduled</p>
            <p className="text-sm text-muted-foreground">
              Your next sessions will appear here once you&apos;ve RSVP&apos;d.
            </p>
          </div>
        )}
      </motion.div>

      {/* Upcoming Events */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3 * 0.08 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-bold text-base">Upcoming Events</h2>
          <Link href="/events" className="text-sm text-primary flex items-center gap-1">
            See all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {upcomingEvents.length > 0 ? (
          <div className="flex flex-col gap-3">
            {upcomingEvents.map(event => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="bg-card rounded-3xl border border-border/50 p-4 active:scale-[0.98] transition-transform cursor-pointer block"
              >
                <div className="flex items-center gap-2 mb-2">
                  {EVENT_TYPE_BADGE[event.event_type] && (
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${EVENT_TYPE_BADGE[event.event_type].className}`}>
                      {EVENT_TYPE_BADGE[event.event_type].label}
                    </span>
                  )}
                  {event.user_rsvp && event.user_rsvp.cancelled_at === null && (
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                      Going
                    </span>
                  )}
                </div>
                <h3 className="font-heading font-bold text-base mb-1">{event.title}</h3>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mb-0.5">
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  <span>{formatEventDate(event.starts_at)}</span>
                </div>
                {event.venue && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span>{event.venue}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-3xl border border-border/50 p-6 text-center">
            <p className="font-heading font-bold text-base mb-1">Nothing coming up</p>
            <p className="text-sm text-muted-foreground">
              Community events will appear here once members start creating them.
            </p>
          </div>
        )}
      </motion.div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 4 * 0.08 }}
          className="mb-6"
        >
          <h2 className="font-heading font-bold text-base mb-3">Announcements</h2>
          <div className="flex flex-col gap-3">
            {announcements.map(announcement => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                canEdit={false}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
