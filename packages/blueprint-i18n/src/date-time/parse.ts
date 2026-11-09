/**
 * Strict parsers for the wire formats the blueprint backend emits. Nothing here hands a string
 * to `new Date()`: the engine reads a date-only string as UTC midnight and a date-time without
 * an offset as browser-local time, and both readings shift the value in some time zone.
 */

export interface WallClock {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_OF_DAY = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/
const LOCAL_READING =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/
const INSTANT =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(?:(Z)|([+-])(\d{2}):(\d{2}))$/i

/**
 * `DateTime.MinValue`, `DateOnly.MinValue` and `DateTimeOffset.MinValue` all serialize with
 * this date part. A .NET property that was never assigned carries it, so it means "no value",
 * not 1 January of year 1.
 */
export function isDotNetDefault(value: string): boolean {
  return value.startsWith('0001-01-01')
}

/**
 * Milliseconds since the epoch for a wall-clock reading taken as UTC. `Date.UTC` maps years
 * 0–99 onto 1900–1999, so the year is set separately.
 */
export function utcEpoch(clock: WallClock): number {
  const date = new Date(0)
  date.setUTCFullYear(clock.year, clock.month - 1, clock.day)
  date.setUTCHours(clock.hour, clock.minute, clock.second, 0)
  return date.getTime()
}

/** Rejects readings the calendar does not have, such as 30 February or 24:00. */
function isValid(clock: WallClock): boolean {
  if (clock.hour > 23 || clock.minute > 59 || clock.second > 59) return false
  const date = new Date(utcEpoch(clock))
  return (
    date.getUTCFullYear() === clock.year &&
    date.getUTCMonth() === clock.month - 1 &&
    date.getUTCDate() === clock.day
  )
}

function toClock(
  year: string,
  month: string,
  day: string,
  hour = '0',
  minute = '0',
  second = '0',
): WallClock | undefined {
  const clock: WallClock = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  }
  return isValid(clock) ? clock : undefined
}

/** `YYYY-MM-DD`. */
export function parseDate(value: string): WallClock | undefined {
  const m = DATE.exec(value)
  return m ? toClock(m[1], m[2], m[3]) : undefined
}

/** `HH:mm` or `HH:mm:ss`, with any fraction ignored; anchored to 1970-01-01. */
export function parseTimeOfDay(value: string): WallClock | undefined {
  const m = TIME_OF_DAY.exec(value)
  return m ? toClock('1970', '01', '01', m[1], m[2], m[3]) : undefined
}

/** `YYYY-MM-DDTHH:mm` or `YYYY-MM-DDTHH:mm:ss`, with any fraction ignored. No offset. */
export function parseLocalReading(value: string): WallClock | undefined {
  const m = LOCAL_READING.exec(value)
  return m ? toClock(m[1], m[2], m[3], m[4], m[5], m[6]) : undefined
}

/** An ISO 8601 date-time that ends in `Z` or `±HH:mm`, as epoch milliseconds. */
export function parseInstant(value: string): number | undefined {
  const m = INSTANT.exec(value)
  if (!m) return undefined
  const clock = toClock(m[1], m[2], m[3], m[4], m[5], m[6])
  if (!clock) return undefined
  const millis = Number((m[7] || '0').padEnd(3, '0').slice(0, 3))
  if (m[8]) return utcEpoch(clock) + millis
  const offsetHours = Number(m[10])
  const offsetMinutes = Number(m[11])
  // RFC 3339 bounds an offset's hours and minutes as it does a time of day's.
  if (offsetHours > 23 || offsetMinutes > 59) return undefined
  const offset = (m[9] === '-' ? -1 : 1) * (offsetHours * 60 + offsetMinutes)
  return utcEpoch(clock) + millis - offset * 60_000
}
