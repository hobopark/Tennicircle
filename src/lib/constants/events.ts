import type { EventType } from '@/lib/types/events'

/** Badge classes for event type pills (used in cards and detail pages). */
export const EVENT_TYPE_BADGE_CLASSES: Record<EventType, string> = {
  tournament: 'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400',
  social: 'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#c8e030]/20 text-[#7a8a00] dark:text-[#c8e030]',
  open_session: 'text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400',
}

/** Badge with label and className (used in dashboards). */
export const EVENT_TYPE_BADGE: Record<string, { label: string; className: string }> = {
  tournament: { label: 'Tournament', className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  social: { label: 'Social', className: 'bg-[#c8e030]/20 text-[#7a8a00] dark:text-[#c8e030]' },
  open_session: { label: 'Open Session', className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
}

/** Calendar block colors (used in WeekCalendarGrid). */
/** Calendar block colors (hex values for inline styles to avoid hydration mismatches). */
export const EVENT_TYPE_HEX: Record<string, { bg: string; border: string; text: string; blockHex: string }> = {
  tournament: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.3)', text: '#2563eb', blockHex: '#3b82f6' },
  social: { bg: 'rgba(200,224,48,0.1)', border: 'rgba(200,224,48,0.3)', text: '#7a8a00', blockHex: '#c8e030' },
  open_session: { bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', text: '#ea580c', blockHex: '#f97316' },
}

/** Calendar block colors (used in WeekCalendarGrid — Tailwind classes for non-SSR contexts). */
export const EVENT_TYPE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string; block: string; blockHex: string }> = {
  tournament: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-600', badge: 'bg-blue-500/20', block: 'bg-blue-500', blockHex: '#3b82f6' },
  social: { bg: 'bg-[#c8e030]/10', border: 'border-[#c8e030]/30', text: 'text-[#7a8a00]', badge: 'bg-[#c8e030]/20', block: 'bg-[#c8e030]', blockHex: '#c8e030' },
  open_session: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-600', badge: 'bg-orange-500/20', block: 'bg-orange-500', blockHex: '#f97316' },
}
