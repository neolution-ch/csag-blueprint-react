import dayjs from './dayjs'

/**
 * dayjs display formats derived from a locale with `Intl`, so a field shows a date the way the
 * UI language writes it: `DD.MM.YYYY` in de-CH, `DD/MM/YYYY` in en-GB, `MM/DD/YYYY` in en-US.
 *
 * The locale is the one Mantine's `DatesProvider` holds, which is also what the calendar
 * dropdown uses for month and weekday names. Every pattern is numeric, so parsing what the
 * user types never depends on a dayjs locale file being loaded.
 */

const SAMPLE = Date.UTC(2026, 10, 23, 9, 5)

const cache = new Map<string, string>()

function memo(key: string, compute: () => string): string {
  let value = cache.get(key)
  if (value === undefined) {
    value = compute()
    cache.set(key, value)
  }
  return value
}

function formatter(
  locale: string,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat | undefined {
  try {
    return new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options })
  } catch {
    // A dayjs locale name that is not a BCP 47 tag.
    return undefined
  }
}

/** Plain spaces for typed input, no bidi marks, and anything with a letter escaped for dayjs. */
function literal(value: string): string {
  const text = value
    .replace(/[\u00a0\u202f]/g, ' ')
    .replace(/[\u061c\u200e\u200f]/g, '')
  return /\p{L}/u.test(text) ? `[${text}]` : text
}

export function hourFormat(locale: string): '12h' | '24h' {
  const cycle = formatter(locale, { hour: 'numeric' })?.resolvedOptions()
    .hourCycle
  return cycle === 'h11' || cycle === 'h12' ? '12h' : '24h'
}

/** `DD.MM.YYYY`, `DD/MM/YYYY`, `MM/DD/YYYY`, `YYYY. MM. DD.` */
export function datePattern(locale: string): string {
  return memo(`date\u0000${locale}`, () => {
    const parts = formatter(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })?.formatToParts(SAMPLE)
    if (!parts) return 'YYYY-MM-DD'
    return parts
      .map((p) => {
        if (p.type === 'year') return 'YYYY'
        if (p.type === 'month') return 'MM'
        if (p.type === 'day') return 'DD'
        return p.type === 'literal' ? literal(p.value) : ''
      })
      .join('')
  })
}

/** `HH:mm`, `h:mm A`, `A h:mm`, with `:ss` after the minutes when seconds are shown. */
export function timePattern(locale: string, withSeconds = false): string {
  return memo(`time\u0000${locale}\u0000${withSeconds}`, () => {
    const twelveHour = hourFormat(locale) === '12h'
    const parts = formatter(locale, {
      hour: 'numeric',
      minute: '2-digit',
    })?.formatToParts(SAMPLE)
    if (!parts) return withSeconds ? 'HH:mm:ss' : 'HH:mm'
    return parts
      .map((p) => {
        if (p.type === 'hour') return twelveHour ? 'h' : 'HH'
        if (p.type === 'minute') return withSeconds ? 'mm:ss' : 'mm'
        if (p.type === 'dayPeriod') return 'A'
        return p.type === 'literal' ? literal(p.value) : ''
      })
      .join('')
  })
}

export function dateTimePattern(locale: string, withSeconds = false): string {
  return `${datePattern(locale)} ${timePattern(locale, withSeconds)}`
}

/**
 * Parses typed input against a dayjs format and returns `YYYY-MM-DD`, or null while the input
 * is not yet a whole, real date. Single-digit days and months are accepted (`1.2.2026` for
 * `DD.MM.YYYY`); an impossible date such as `31.02.2026` is rejected rather than rolled over.
 */
export function parseDateInput(
  input: string,
  format: string,
  locale: string,
): string | null {
  const relaxed = format.replace(/\[[^\]]*\]|M+|D+/g, (token) =>
    token === 'MM' ? 'M' : token === 'DD' ? 'D' : token,
  )
  const parsed = dayjs(input.trim(), [format, relaxed], locale, true)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD') : null
}
