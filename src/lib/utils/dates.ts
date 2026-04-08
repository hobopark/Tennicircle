/**
 * Format an ISO datetime string for display in Sydney timezone.
 * Works correctly on both client (browser) and server (Vercel UTC).
 * Example: "Wed, 4 Jun · 6:00 pm"
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  const tz = 'Australia/Sydney'
  const dayName = date.toLocaleDateString('en-AU', { timeZone: tz, weekday: 'short' })
  const day = Number(date.toLocaleDateString('en-AU', { timeZone: tz, day: 'numeric' }))
  const month = date.toLocaleDateString('en-AU', { timeZone: tz, month: 'short' })
  const time = date.toLocaleTimeString('en-AU', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${dayName}, ${day} ${month} · ${time}`
}

/**
 * Format a session datetime for display.
 * Alias for formatDateTime — used in session/coach contexts.
 */
export function formatSessionDateTime(isoString: string): string {
  return formatDateTime(isoString)
}

/**
 * Format an event date for display.
 * Alias for formatDateTime — used in event card contexts.
 */
export function formatEventDate(isoString: string): string {
  return formatDateTime(isoString)
}

/**
 * Format an attendance date for display.
 * Alias for formatDateTime — used in coach client contexts.
 */
export function formatAttendanceDate(isoString: string): string {
  return formatDateTime(isoString)
}
