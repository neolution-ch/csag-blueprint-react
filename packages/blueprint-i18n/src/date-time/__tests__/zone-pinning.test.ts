import { describe, expect, it } from 'vitest'
import { viewerTimeZone } from '../zones'

describe('test zone pinning', () => {
  it('runs under one of the zones the vitest configs pin', () => {
    const zone = viewerTimeZone()
    expect(['Europe/Zurich', 'America/Los_Angeles']).toContain(zone)
    expect(new Date(Date.UTC(2026, 6, 1)).getTimezoneOffset()).toBe(
      zone === 'Europe/Zurich' ? -120 : 420,
    )
  })
})
