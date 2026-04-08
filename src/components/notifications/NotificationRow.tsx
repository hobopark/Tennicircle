import { CalendarDays, Megaphone, CheckCircle2, PenLine, XCircle, UserX } from 'lucide-react'
import type { NotificationRow, NotificationType } from '@/lib/types/notifications'

interface Props {
  notification: NotificationRow
  onTap: (n: NotificationRow) => void
}

function getIcon(type: NotificationType) {
  switch (type) {
    case 'session_reminder':
      return <CalendarDays className="w-4 h-4 text-primary" aria-hidden="true" />
    case 'announcement':
      return <Megaphone className="w-4 h-4 text-primary" aria-hidden="true" />
    case 'rsvp_confirmed':
    case 'waitlist_promoted':
      return <CheckCircle2 className="w-4 h-4 text-primary" aria-hidden="true" />
    case 'event_updated':
    case 'session_updated':
      return <PenLine className="w-4 h-4 text-primary" aria-hidden="true" />
    case 'session_cancelled':
      return <XCircle className="w-4 h-4 text-orange-600 dark:text-orange-400" aria-hidden="true" />
    case 'rsvp_cancelled':
      return <UserX className="w-4 h-4 text-primary" aria-hidden="true" />
    default:
      return <CalendarDays className="w-4 h-4 text-primary" aria-hidden="true" />
  }
}

function getAriaLabel(type: NotificationType): string {
  switch (type) {
    case 'session_reminder': return 'Session reminder'
    case 'announcement': return 'Announcement'
    case 'rsvp_confirmed': return 'RSVP confirmed'
    case 'waitlist_promoted': return 'RSVP confirmed'
    case 'event_updated': return 'Event updated'
    case 'session_updated': return 'Session updated'
    case 'session_cancelled': return 'Session cancelled'
    case 'rsvp_cancelled': return 'RSVP cancelled'
    default: return 'Notification'
  }
}

function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMin = Math.floor((now - then) / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(isoString).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export function NotificationRow({ notification, onTap }: Props) {
  return (
    <button
      onClick={() => onTap(notification)}
      className={`w-full text-left flex gap-3 p-4 rounded-2xl transition-transform active:scale-[0.98] ${
        notification.read_at
          ? 'bg-muted/40'
          : 'bg-card border-l-2 border-primary'
      }`}
    >
      <span
        className="shrink-0 w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"
        aria-label={getAriaLabel(notification.notification_type)}
      >
        {getIcon(notification.notification_type)}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-base font-heading ${notification.read_at ? 'font-normal' : 'font-semibold'} truncate`}>
            {notification.title}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>
        <p className="text-sm text-muted-foreground truncate mt-0.5">
          {notification.body}
        </p>
      </div>
    </button>
  )
}
