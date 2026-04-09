import { describe, it, expect } from 'vitest'

// Per D-04: Timezone suffix only shown when user's browser timezone differs
// from Australia/Sydney. getTimezoneLabel will be in src/lib/utils/timezone.ts

// Inline stub matching the expected implementation contract
function getTimezoneLabel(mockUserTz?: string): string | null {
  // In real implementation, uses Intl.DateTimeFormat().resolvedOptions().timeZone
  const userTz = mockUserTz ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  if (userTz === 'Australia/Sydney') return null
  const abbr = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    timeZoneName: 'short',
  })
    .formatToParts(new Date())
    .find(p => p.type === 'timeZoneName')?.value ?? null
  return abbr
}

describe('getTimezoneLabel (D-04)', () => {
  it('returns null for Australia/Sydney users (no suffix needed)', () => {
    expect(getTimezoneLabel('Australia/Sydney')).toBeNull()
  })

  it('returns AEST or AEDT for non-Sydney users', () => {
    const label = getTimezoneLabel('America/New_York')
    expect(label).not.toBeNull()
    expect(['AEST', 'AEDT']).toContain(label)
  })

  it('returns a short timezone name string', () => {
    const label = getTimezoneLabel('Europe/London')
    expect(typeof label).toBe('string')
    expect(label!.length).toBeLessThanOrEqual(4)
  })
})
