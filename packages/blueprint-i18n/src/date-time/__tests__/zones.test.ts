import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { todayAt, viewerTimeZone } from '../zones'

describe('todayAt', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    // 2026-10-25 22:30 UTC: 23:30 in Zurich (CET, after the fall-back), 15:30 in Los Angeles,
    // already the 26th in Auckland.
    ['2026-10-25T22:30:00Z', 'Europe/Zurich', '2026-10-25'],
    ['2026-10-25T22:30:00Z', 'America/Los_Angeles', '2026-10-25'],
    ['2026-10-25T22:30:00Z', 'Pacific/Auckland', '2026-10-26'],
    // 22:30 UTC the day before is already 00:30 on the 25th in Zurich (still CEST).
    ['2026-10-24T22:30:00Z', 'Europe/Zurich', '2026-10-25'],
    // 2027-03-27 23:30 UTC is 00:30 on the 28th in Zurich, the day it springs forward.
    ['2027-03-27T23:30:00Z', 'Europe/Zurich', '2027-03-28'],
    ['2027-03-27T23:30:00Z', 'America/Los_Angeles', '2027-03-27'],
    ['2027-03-28T06:59:00Z', 'America/Los_Angeles', '2027-03-27'],
    ['2027-03-28T07:00:00Z', 'America/Los_Angeles', '2027-03-28'],
  ])('at %s is %s in %s', (now, zone, expected) => {
    vi.setSystemTime(new Date(now))
    expect(todayAt(zone)).toBe(expected)
  })

  it('answers for the zone it is given, not the viewer zone', () => {
    vi.setSystemTime(new Date('2026-10-25T23:30:00Z'))
    expect(todayAt('UTC')).toBe('2026-10-25')
    expect(todayAt('Europe/Zurich')).toBe('2026-10-26')
    expect(todayAt(viewerTimeZone())).toBe(
      viewerTimeZone() === 'Europe/Zurich' ? '2026-10-26' : '2026-10-25',
    )
  })

  it('rejects an id that is not a time zone', () => {
    expect(() => todayAt('Mars/Olympus_Mons')).toThrow(RangeError)
  })
})
