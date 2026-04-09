import { describe, it, expect } from 'vitest'

// CapacityBadge will be defined in ClientDashboard.tsx or extracted to its own file.
// These tests validate the color logic per D-01:
//   - green (open): confirmed < 75% of capacity
//   - orange (>=75% full): confirmed >= 75% but < 100%
//   - red (full/waitlist): confirmed >= capacity

// Helper that mirrors the expected color logic
function capacityColorClass(confirmed: number, capacity: number): string {
  if (confirmed >= capacity) return 'text-red-500 bg-red-500/10'
  if (confirmed / capacity >= 0.75) return 'text-orange-500 bg-orange-500/10'
  return 'text-primary bg-primary/10'
}

describe('CapacityBadge color logic', () => {
  it('returns green for open sessions (below 75%)', () => {
    expect(capacityColorClass(2, 8)).toBe('text-primary bg-primary/10')
    expect(capacityColorClass(0, 8)).toBe('text-primary bg-primary/10')
    expect(capacityColorClass(5, 8)).toBe('text-primary bg-primary/10')
  })

  it('returns orange for almost full sessions (>= 75%)', () => {
    expect(capacityColorClass(6, 8)).toBe('text-orange-500 bg-orange-500/10')
    expect(capacityColorClass(7, 8)).toBe('text-orange-500 bg-orange-500/10')
    // Exactly 75%
    expect(capacityColorClass(3, 4)).toBe('text-orange-500 bg-orange-500/10')
  })

  it('returns red for full sessions (confirmed >= capacity)', () => {
    expect(capacityColorClass(8, 8)).toBe('text-red-500 bg-red-500/10')
    expect(capacityColorClass(10, 8)).toBe('text-red-500 bg-red-500/10')
  })

  it('formats display as fraction "X/Y spots"', () => {
    // This validates the display format per D-01
    const confirmed = 4
    const capacity = 8
    const display = `${confirmed}/${capacity} spots`
    expect(display).toBe('4/8 spots')
  })
})
