/**
 * Format an ISO datetime string for display.
 * Example: "Wed, 4 Jun · 6:00 pm"
 */
export function formatDateTime(isoString: string): string {
  const date = new Date(isoString)
  const dayName = date.toLocaleDateString('en-AU', { weekday: 'short' })
  const day = date.getDate()
  const month = date.toLocaleDateString('en-AU', { month: 'short' })
  const time = date.toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  return `${dayName}, ${day} ${month} · ${time}`
}
