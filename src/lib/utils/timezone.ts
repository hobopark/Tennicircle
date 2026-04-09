/**
 * Returns the short timezone abbreviation for Australia/Sydney (e.g., "AEST" or "AEDT")
 * when the user's browser timezone differs from Australia/Sydney, or null if they are
 * already in the Sydney timezone (no suffix needed).
 *
 * Uses client-side Intl API — must be called in a useEffect to avoid hydration mismatch.
 */
export function getTimezoneLabel(): string | null {
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone
  if (userTz === 'Australia/Sydney') return null
  const abbr = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    timeZoneName: 'short',
  }).formatToParts(new Date()).find(p => p.type === 'timeZoneName')?.value ?? null
  return abbr
}

/**
 * Returns true if the given ISO timestamp falls on today in Australia/Sydney timezone.
 * Used to split session lists into "Today" and "This Week" sections (D-11).
 */
export function isTodaySydney(isoString: string): boolean {
  const fmt = (d: Date) => new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d)
  return fmt(new Date(isoString)) === fmt(new Date())
}
