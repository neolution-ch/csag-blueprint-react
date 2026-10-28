import { utcEpoch } from './parse'
import type { WallClock } from './parse'

const DAY_MS = 86_400_000

const wallClockFormatters = new Map<string, Intl.DateTimeFormat>()
const zoneNameFormatters = new Map<string, Intl.DateTimeFormat>()

/**
 * Reads the numeric fields of an instant as a zone's clock shows them. The locale is fixed and
 * never shown to anyone: `en-US` with `h23` yields plain ASCII digits and a midnight of `00`.
 */
function wallClockFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = wallClockFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    wallClockFormatters.set(timeZone, formatter)
  }
  return formatter
}

/** The reading a zone's clock shows at an instant. */
export function wallClockAt(epoch: number, timeZone: string): WallClock {
  const clock: WallClock = {
    year: 0,
    month: 0,
    day: 0,
    hour: 0,
    minute: 0,
    second: 0,
  }
  for (const part of wallClockFormatter(timeZone).formatToParts(epoch)) {
    if (part.type in clock) {
      clock[part.type as keyof WallClock] = Number(part.value)
    }
  }
  return clock
}

/** The zone's UTC offset at an instant, in milliseconds. */
function offsetAt(epoch: number, timeZone: string): number {
  const wholeSeconds = Math.floor(epoch / 1000) * 1000
  return utcEpoch(wallClockAt(wholeSeconds, timeZone)) - wholeSeconds
}

/**
 * The instant a zone's clock shows a given reading.
 *
 * When the reading happens twice (the hour repeated when clocks fall back) this is the earlier
 * occurrence, matching the server. When it never happens (the hour skipped when clocks spring
 * forward) the reading is invalid; the offset in force before the gap is used, the same
 * resolution `Date` applies.
 */
export function localReadingToEpoch(
  clock: WallClock,
  timeZone: string,
): number {
  const asUtc = utcEpoch(clock)
  const offsetBefore = offsetAt(asUtc - DAY_MS, timeZone)
  const offsetAfter = offsetAt(asUtc + DAY_MS, timeZone)
  let earliest: number | undefined
  for (const offset of new Set([offsetBefore, offsetAfter])) {
    const candidate = asUtc - offset
    if (
      offsetAt(candidate, timeZone) === offset &&
      (earliest === undefined || candidate < earliest)
    ) {
      earliest = candidate
    }
  }
  return earliest ?? asUtc - offsetBefore
}

/** The zone's short name at an instant in the given locale: `CET`, `MESZ`, `GMT-7`. */
export function shortZoneName(
  epoch: number,
  timeZone: string,
  locale: string,
): string {
  const key = `${locale}\u0000${timeZone}`
  let formatter = zoneNameFormatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      timeZone,
      timeZoneName: 'short',
    })
    zoneNameFormatters.set(key, formatter)
  }
  return (
    formatter.formatToParts(epoch).find((p) => p.type === 'timeZoneName')
      ?.value ?? timeZone
  )
}

/**
 * True when the engine resolves both ids to the same zone: always across letter case, and
 * across links such as `Etc/UTC` and `UTC` where the engine canonicalizes them. A miss only
 * adds a zone label that was not needed.
 */
export function isSameZone(a: string, b: string): boolean {
  if (a === b) return true
  return (
    wallClockFormatter(a).resolvedOptions().timeZone ===
    wallClockFormatter(b).resolvedOptions().timeZone
  )
}

/**
 * How long a read of the viewer's zone is trusted. Reading it means constructing an
 * `Intl.DateTimeFormat`, which costs more than the rest of a `formatPlaceTime` call together,
 * and a table formats hundreds of cells per render.
 */
const VIEWER_ZONE_TTL_MS = 60_000

let viewerZone: { id: string; readAt: number } | undefined
let listeningForZoneChanges = false

/** Forgets the cached viewer zone. Exported for tests only; not part of the package API. */
export function forgetViewerTimeZone(): void {
  viewerZone = undefined
}

/**
 * The operating system's zone can change while a tab stays open, typically while the user is
 * in another window or the laptop is closed. Coming back to the tab re-reads it.
 */
function listenForZoneChanges(): void {
  if (listeningForZoneChanges || typeof window === 'undefined') return
  listeningForZoneChanges = true
  window.addEventListener('focus', forgetViewerTimeZone)
  document.addEventListener('visibilitychange', forgetViewerTimeZone)
}

/**
 * The IANA id of the zone the browser runs in. Cached, and read again after a minute or when
 * the tab regains focus or visibility.
 */
export function viewerTimeZone(): string {
  const now = Date.now()
  if (!viewerZone || Math.abs(now - viewerZone.readAt) > VIEWER_ZONE_TTL_MS) {
    viewerZone = {
      id: new Intl.DateTimeFormat().resolvedOptions().timeZone,
      readAt: now,
    }
    listenForZoneChanges()
  }
  return viewerZone.id
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, '0')
}

/** Today's date in a zone, as `YYYY-MM-DD`. */
export function todayAt(timeZone: string): string {
  const { year, month, day } = wallClockAt(Date.now(), timeZone)
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`
}
