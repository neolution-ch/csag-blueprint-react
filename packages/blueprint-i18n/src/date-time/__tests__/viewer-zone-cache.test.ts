// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { forgetViewerTimeZone, viewerTimeZone } from '../zones'

// Node re-reads its zone whenever `process.env.TZ` is assigned, which stands in for the user
// changing the operating system's zone while the tab is open.
const env = (
  globalThis as unknown as {
    process: { env: Record<string, string | undefined> }
  }
).process.env
const pinnedZone = env.TZ
const otherZone = 'Asia/Tokyo'

describe('viewerTimeZone cache', () => {
  beforeEach(() => {
    forgetViewerTimeZone()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-26T09:00:00Z'))
  })
  afterEach(() => {
    env.TZ = pinnedZone
    forgetViewerTimeZone()
    vi.useRealTimers()
  })

  it('reuses one read for a minute', () => {
    expect(viewerTimeZone()).toBe(pinnedZone)
    env.TZ = otherZone
    vi.advanceTimersByTime(59_000)
    expect(viewerTimeZone()).toBe(pinnedZone)
    vi.advanceTimersByTime(2_000)
    expect(viewerTimeZone()).toBe(otherZone)
  })

  it('reads again when the window regains focus', () => {
    expect(viewerTimeZone()).toBe(pinnedZone)
    env.TZ = otherZone
    expect(viewerTimeZone()).toBe(pinnedZone)
    window.dispatchEvent(new Event('focus'))
    expect(viewerTimeZone()).toBe(otherZone)
  })

  it('reads again when the tab becomes visible', () => {
    expect(viewerTimeZone()).toBe(pinnedZone)
    env.TZ = otherZone
    document.dispatchEvent(new Event('visibilitychange'))
    expect(viewerTimeZone()).toBe(otherZone)
  })
})
