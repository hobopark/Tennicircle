'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { markAllNotificationsRead, markNotificationRead } from '@/lib/actions/notifications'
import type { NotificationRow, NotificationType } from '@/lib/types/notifications'
import type { UserRole } from '@/lib/types/auth'
import { NotificationRow as NotificationRowComponent } from './NotificationRow'

interface Props {
  initialNotifications: NotificationRow[]
  memberId: string
  userRole: UserRole
}

function resolveDeepLink(n: NotificationRow, userRole: UserRole): string {
  const meta = n.metadata as Record<string, string> | null
  const isCoachOrAdmin = userRole === 'coach' || userRole === 'admin'

  function sessionLink(id: string | undefined) {
    if (!id) return isCoachOrAdmin ? '/coach' : '/sessions'
    return isCoachOrAdmin ? `/coach/sessions/${id}` : `/sessions/${id}`
  }

  if (!meta) return '/notifications'

  switch (n.notification_type as NotificationType) {
    case 'session_reminder':
      return sessionLink(meta.session_id)
    case 'announcement':
      return '/events'
    case 'rsvp_confirmed':
    case 'waitlist_promoted':
    case 'event_updated':
    case 'session_updated':
    case 'session_cancelled':
    case 'rsvp_cancelled':
      if (meta.resource_type === 'event') {
        return meta.resource_id ? `/events/${meta.resource_id}` : '/events'
      }
      return sessionLink(meta.resource_id)
    default:
      return '/notifications'
  }
}

export function NotificationFeed({ initialNotifications, memberId, userRole: serverRole }: Props) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationRow[]>(initialNotifications)
  const [unreadCount, setUnreadCount] = useState(
    initialNotifications.filter(n => n.read_at === null).length
  )
  const [role, setRole] = useState<UserRole>(serverRole || 'pending')

  // Client-side role resolution fallback (handles client-side navigation where server props may be stale)
  useEffect(() => {
    if (serverRole && serverRole !== 'pending') {
      setRole(serverRole)
      return
    }
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        try {
          const payload = JSON.parse(atob(session.access_token.split('.')[1]))
          if (payload.user_role) setRole(payload.user_role as UserRole)
        } catch { /* ignore */ }
      }
    })
  }, [serverRole])

  useEffect(() => {
    if (!memberId) return

    const supabase = createClient()
    const channel = supabase
      .channel('notifications-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `member_id=eq.${memberId}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as NotificationRow, ...prev])
          setUnreadCount(prev => prev + 1)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [memberId])

  async function handleMarkAllRead() {
    // Optimistic update
    const now = new Date().toISOString()
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at ?? now })))
    setUnreadCount(0)
    await markAllNotificationsRead()
  }

  async function handleRowTap(notification: NotificationRow) {
    if (!notification.read_at) {
      // Optimistic update — mark as read in local state
      setNotifications(prev =>
        prev.map(n => n.id === notification.id
          ? { ...n, read_at: new Date().toISOString() }
          : n
        )
      )
      // Decrement unread count immediately (keeps bell badge and Mark All button in sync)
      setUnreadCount(prev => Math.max(0, prev - 1))
      // Fire-and-forget server update
      markNotificationRead(notification.id)
    }
    const link = resolveDeepLink(notification, role)
    router.push(link)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-heading font-bold">Notifications</h1>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            className="text-sm text-primary rounded-xl"
            onClick={handleMarkAllRead}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-20 text-center">
          <Bell className="w-12 h-12 text-muted-foreground/40 mb-4" aria-hidden="true" />
          <h2 className="text-base font-heading font-semibold mb-1">You&apos;re all caught up</h2>
          <p className="text-sm text-muted-foreground">
            New session reminders, announcements, and RSVP updates will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, index) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index, 5) * 0.05 }}
            >
              <NotificationRowComponent
                notification={n}
                onTap={handleRowTap}
              />
            </motion.div>
          ))}
        </div>
      )}
    </>
  )
}
