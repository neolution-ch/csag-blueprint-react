import {
  isDotNetDefault,
  parseDate,
  parseInstant,
  parseLocalReading,
  parseTimeOfDay,
  utcEpoch,
} from './parse'
import {
  isSameZone,
  localReadingToEpoch,
  shortZoneName,
  viewerTimeZone,
  wallClockAt,
} from './zones'

/**
 * `medium` (the default) is the locale's medium date: `21 Oct 2026`, `21.10.2026`,
 * `Oct 21, 2026`. `short` is the locale's short date with the year always written in full:
 * `21/10/2026`, `21.10.2026`, `10/21/2026`.
 */
export type DateStyle = 'short' | 'medium'

/** Passed straight to `Intl.DurationFormat`: `1 hr, 30 min`, `1 hour, 30 minutes`, `1h 30m`. */
export type DurationStyle = 'short' | 'long' | 'narrow'

export interface DateFormatOptions {
  style?: DateStyle
}

export interface DateTimeFormatOptions extends DateFormatOptions {
  /** Show the date without the time of day. */
  dateOnly?: boolean
}

export interface InstantFormatOptions extends DateTimeFormatOptions {
  /**
   * The IANA zone to show the instant in. Defaults to the viewer's zone. A zone other than the
   * viewer's is labelled with its short name.
   */
  timeZone?: string
}

export interface PlaceTimeFormatOptions extends DateTimeFormatOptions {
  /**
   * The IANA zone of the place the reading belongs to. That is the tenant's zone unless the
   * place carries its own, such as a stand at a fair in another country.
   */
  placeZone: string
}

export interface DurationFormatOptions {
  style?: DurationStyle
}

/**
 * Every formatter takes the locale explicitly. Formatting with the browser's default locale
 * would show a German UI's dates in the operating system's language.
 */
export interface LocaleOption {
  locale: string
}

type Input = string | null | undefined

const formatters = new Map<string, Intl.DateTimeFormat>()

/** Constructing an `Intl.DateTimeFormat` costs far more than calling it; a table calls it per cell. */
function dateTimeFormatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}\u0000${JSON.stringify(options)}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options)
    formatters.set(key, formatter)
  }
  return formatter
}

/**
 * Every wall-clock reading is formatted as if it were UTC, in UTC, so the browser's own zone
 * never takes part. Zone conversion, where there is one, happens before this point.
 */
function readingFormatter(
  locale: string,
  style: DateStyle,
  dateOnly: boolean,
): Intl.DateTimeFormat {
  return dateTimeFormatter(locale, {
    timeZone: 'UTC',
    dateStyle: style,
    ...(dateOnly ? {} : { timeStyle: 'short' }),
  })
}

function fullYear(epoch: number, locale: string): string {
  return (
    dateTimeFormatter(locale, { timeZone: 'UTC', year: 'numeric' })
      .formatToParts(epoch)
      .find((p) => p.type === 'year')?.value ?? ''
  )
}

/** Several locales' short dates carry a two-digit year (`21.10.26`, `10/21/26`). */
function widenYear<TPart extends Intl.DateTimeFormatPart>(
  parts: Array<TPart>,
  year: (part: TPart) => string,
): string {
  return parts
    .map((part) => (part.type === 'year' ? year(part) : part.value))
    .join('')
}

function formatReading(
  epoch: number,
  locale: string,
  options: DateTimeFormatOptions,
): string {
  const parts = readingFormatter(
    locale,
    options.style ?? 'medium',
    options.dateOnly ?? false,
  ).formatToParts(epoch)
  return widenYear(parts, () => fullYear(epoch, locale))
}

/** Both an empty string and the .NET default (`0001-01-01…`) mean the field has no value. */
function hasNoValue(value: string): boolean {
  return value === '' || isDotNetDefault(value)
}

/**
 * Formats an instant (`2026-10-21T08:00:00Z`, or any ISO 8601 date-time with an offset) in the
 * viewer's zone, or in `timeZone` when given. A value without an offset is not an instant and
 * is returned unchanged.
 */
export function formatInstant(
  isoInstant: Input,
  options: InstantFormatOptions & LocaleOption,
): string {
  if (isoInstant == null || hasNoValue(isoInstant)) return ''
  const epoch = parseInstant(isoInstant)
  if (epoch === undefined) return isoInstant

  const viewer = viewerTimeZone()
  const zone = options.timeZone ?? viewer
  const text = formatReading(
    utcEpoch(wallClockAt(epoch, zone)),
    options.locale,
    options,
  )
  if (options.dateOnly || isSameZone(zone, viewer)) return text
  return `${text} ${shortZoneName(epoch, zone, options.locale)}`
}

/**
 * Formats a place's local reading (`2026-10-26T10:00:00`) exactly as written: the browser's
 * zone never shifts it. When the viewer is in a different zone than the place, the place
 * zone's short name for that date is appended (`26 Oct 2026, 10:00 CET`), so a reader abroad
 * knows whose clock it is.
 */
export function formatPlaceTime(
  localReading: Input,
  options: PlaceTimeFormatOptions & LocaleOption,
): string {
  if (localReading == null || hasNoValue(localReading)) return ''
  const clock = parseLocalReading(localReading)
  if (!clock) return localReading

  const text = formatReading(utcEpoch(clock), options.locale, options)
  if (options.dateOnly || isSameZone(options.placeZone, viewerTimeZone())) {
    return text
  }
  const epoch = localReadingToEpoch(clock, options.placeZone)
  return `${text} ${shortZoneName(epoch, options.placeZone, options.locale)}`
}

/** Formats a calendar date (`2026-10-21`). No zone is involved, so none can shift it. */
export function formatDate(
  date: Input,
  options: DateFormatOptions & LocaleOption,
): string {
  if (date == null || hasNoValue(date)) return ''
  const clock = parseDate(date)
  if (!clock) return date
  return formatReading(utcEpoch(clock), options.locale, {
    ...options,
    dateOnly: true,
  })
}

/** Formats a time of day (`09:00:00`) with the locale's 12- or 24-hour clock. Seconds are not shown. */
export function formatTimeOfDay(time: Input, options: LocaleOption): string {
  if (time == null || time === '') return ''
  const clock = parseTimeOfDay(time)
  if (!clock) return time
  return dateTimeFormatter(options.locale, {
    timeZone: 'UTC',
    timeStyle: 'short',
  }).format(utcEpoch(clock))
}

/**
 * Formats two calendar dates as one range (`21–25 Oct 2026`). Either side may be missing, as
 * in a table filter; the open side is shown as the locale's range separator alone
 * (`21 Oct 2026 –`).
 */
export function formatDateRange(
  from: Input,
  to: Input,
  options: DateFormatOptions & LocaleOption,
): string {
  const start = from == null || hasNoValue(from) ? undefined : parseDate(from)
  const end = to == null || hasNoValue(to) ? undefined : parseDate(to)
  const formatter = readingFormatter(
    options.locale,
    options.style ?? 'medium',
    true,
  )

  if (start && end) {
    const startEpoch = utcEpoch(start)
    const endEpoch = utcEpoch(end)
    return widenYear(formatter.formatRangeToParts(startEpoch, endEpoch), (p) =>
      fullYear(p.source === 'endRange' ? endEpoch : startEpoch, options.locale),
    )
  }

  const fromText = formatDate(from, options)
  const toText = formatDate(to, options)
  if (!fromText && !toText) return ''
  return [fromText, toText].join(rangeSeparator(formatter)).trim()
}

/**
 * The literal a locale puts between the two ends of a range: ` – `, `–`, ` ~ `. It is the text
 * between the last part of the start and the first part of the end. The other `shared` parts
 * are fields both ends have in common, such as the era in `Jan 1, 12 – Jan 1, 13 Heisei`.
 *
 * A locale whose dates end in a literal (`1 янв. 2000 г.`, `2000. 1. 1.`) writes the start's
 * copy of it at the head of that text (` г. – `, `. ~ `) and the end's copy after the end. The
 * single date the separator is joined to already ends in it, so that copy is cut off.
 */
function rangeSeparator(formatter: Intl.DateTimeFormat): string {
  const parts = formatter.formatRangeToParts(
    Date.UTC(2000, 0, 1),
    Date.UTC(2001, 0, 1),
  )
  const text = (from: number, to?: number) =>
    parts
      .slice(from, to)
      .map((p) => p.value)
      .join('')
  const separator = text(
    parts.findLastIndex((p) => p.source === 'startRange') + 1,
    parts.findIndex((p) => p.source === 'endRange'),
  )
  const closing = text(parts.findLastIndex((p) => p.source === 'endRange') + 1)
  // The two copies need not use the same space character (mk: U+2009, then U+202F).
  const blank = (value: string) => value.replace(/\s/g, ' ')
  return blank(separator).startsWith(blank(closing))
    ? separator.slice(closing.length)
    : separator
}

interface DurationFormatter {
  format: (duration: { hours?: number; minutes?: number }) => string
}

type DurationFormatConstructor = new (
  locale: string,
  options: { style: DurationStyle; minutesDisplay?: 'always' | 'auto' },
) => DurationFormatter

/**
 * Formats a duration in minutes as hours and minutes (`1 hr, 30 min`). Days are never used: a
 * duration is exact elapsed time, and a calendar day is 23 or 25 hours long twice a year.
 *
 * Uses `Intl.DurationFormat` where the browser has it. Elsewhere the same output is composed
 * from `Intl.NumberFormat` units joined by `Intl.ListFormat`, which is what `DurationFormat`
 * itself does.
 */
export function formatDuration(
  minutes: number | null | undefined,
  options: DurationFormatOptions & LocaleOption,
): string {
  if (minutes == null || !Number.isFinite(minutes)) return ''
  const style = options.style ?? 'short'
  const total = Math.round(minutes)
  const sign = total < 0 ? -1 : 1
  const hours = Math.floor(Math.abs(total) / 60)
  const rest = Math.abs(total) % 60

  const DurationFormat = (
    Intl as unknown as { DurationFormat?: DurationFormatConstructor }
  ).DurationFormat
  if (DurationFormat) {
    // An all-zero duration formats as an empty string unless a unit is forced to show.
    return new DurationFormat(options.locale, {
      style,
      ...(total === 0 ? { minutesDisplay: 'always' } : {}),
    }).format({ hours: sign * hours || 0, minutes: sign * rest || 0 })
  }

  const unit = (name: 'hour' | 'minute', value: number) =>
    new Intl.NumberFormat(options.locale, {
      style: 'unit',
      unit: name,
      unitDisplay: style,
    }).format(value)
  const units: Array<string> = []
  if (hours > 0) units.push(unit('hour', sign * hours))
  if (rest > 0 || hours === 0) {
    units.push(unit('minute', hours > 0 ? rest : sign * rest))
  }
  return new Intl.ListFormat(options.locale, { type: 'unit', style }).format(
    units,
  )
}
