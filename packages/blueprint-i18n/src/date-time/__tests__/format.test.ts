import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateRange,
  formatDuration,
  formatInstant,
  formatPlaceTime,
  formatTimeOfDay,
} from '../format'
import { viewerTimeZone } from '../zones'

// ICU separates a time from its day period, and the ends of a range, with no-break and thin
// spaces. They are correct output but unreadable in an expectation.
const norm = (value: string) => value.replace(/[\u00a0\u2009\u202f]/g, ' ')

const inZurich = viewerTimeZone() === 'Europe/Zurich'
const inLosAngeles = viewerTimeZone() === 'America/Los_Angeles'

const enGB = { locale: 'en-GB' }
const deCH = { locale: 'de-CH' }
const enUS = { locale: 'en-US' }

describe('formatDate', () => {
  it('formats in the given locale, medium by default', () => {
    expect(formatDate('2026-10-21', enGB)).toBe('21 Oct 2026')
    expect(formatDate('2026-10-21', deCH)).toBe('21.10.2026')
    expect(formatDate('2026-10-21', enUS)).toBe('Oct 21, 2026')
  })

  it('writes the year in full in the short style', () => {
    expect(formatDate('2026-10-21', { ...enGB, style: 'short' })).toBe(
      '21/10/2026',
    )
    expect(formatDate('2026-10-21', { ...deCH, style: 'short' })).toBe(
      '21.10.2026',
    )
    expect(formatDate('2026-10-21', { ...enUS, style: 'short' })).toBe(
      '10/21/2026',
    )
  })

  it.each([
    ['2026-10-25', '25 Oct 2026'],
    ['2027-03-28', '28 Mar 2027'],
    ['2026-01-01', '1 Jan 2026'],
    ['2026-12-31', '31 Dec 2026'],
  ])('never shifts %s by the viewer zone', (date, expected) => {
    expect(formatDate(date, enGB)).toBe(expected)
  })

  it('treats null, empty and the .NET default as no value', () => {
    expect(formatDate(null, enGB)).toBe('')
    expect(formatDate(undefined, enGB)).toBe('')
    expect(formatDate('', enGB)).toBe('')
    expect(formatDate('0001-01-01', enGB)).toBe('')
  })

  it('returns a value that is not a calendar date unchanged', () => {
    expect(formatDate('2026-02-30', enGB)).toBe('2026-02-30')
    expect(formatDate('21.10.2026', enGB)).toBe('21.10.2026')
    expect(formatDate('2026-10-21T00:00:00Z', enGB)).toBe(
      '2026-10-21T00:00:00Z',
    )
  })
})

describe('formatInstant', () => {
  it('shows an instant in the viewer zone by default, without a label', () => {
    const text = formatInstant('2026-10-25T00:30:00Z', enGB)
    if (inZurich) expect(text).toBe('25 Oct 2026, 02:30')
    if (inLosAngeles) expect(text).toBe('24 Oct 2026, 17:30')
  })

  it('reads the offset of the value, whatever it is', () => {
    expect(formatInstant('2026-10-21T10:00:00+02:00', enGB)).toBe(
      formatInstant('2026-10-21T08:00:00Z', enGB),
    )
    expect(formatInstant('2026-10-21T01:00:00-07:00', enGB)).toBe(
      formatInstant('2026-10-21T08:00:00Z', enGB),
    )
    expect(formatInstant('2026-10-21T08:00:00.1234567Z', enGB)).toBe(
      formatInstant('2026-10-21T08:00:00Z', enGB),
    )
  })

  it('tells the two 02:30s apart when Zurich falls back on 2026-10-25', () => {
    const options = { ...enGB, timeZone: 'Europe/Zurich' }
    const label = (name: string) => (inZurich ? '' : ` ${name}`)
    expect(formatInstant('2026-10-25T00:30:00Z', options)).toBe(
      `25 Oct 2026, 02:30${label('CEST')}`,
    )
    expect(formatInstant('2026-10-25T01:30:00Z', options)).toBe(
      `25 Oct 2026, 02:30${label('CET')}`,
    )
  })

  it('jumps from 01:59 to 03:00 when Zurich springs forward on 2027-03-28', () => {
    const options = { ...enGB, timeZone: 'Europe/Zurich' }
    const label = (name: string) => (inZurich ? '' : ` ${name}`)
    expect(formatInstant('2027-03-28T00:59:00Z', options)).toBe(
      `28 Mar 2027, 01:59${label('CET')}`,
    )
    expect(formatInstant('2027-03-28T01:00:00Z', options)).toBe(
      `28 Mar 2027, 03:00${label('CEST')}`,
    )
  })

  it('labels a zone other than the viewer zone in the UI language', () => {
    const text = formatInstant('2026-10-26T09:00:00Z', {
      ...deCH,
      timeZone: inZurich ? 'America/Los_Angeles' : 'Europe/Zurich',
    })
    expect(text).toBe(
      inZurich ? '26.10.2026, 02:00 GMT-7' : '26.10.2026, 10:00 MEZ',
    )
  })

  it('takes the date from the zone the instant is shown in', () => {
    const text = formatInstant('2026-10-25T23:30:00Z', {
      ...enGB,
      dateOnly: true,
    })
    if (inZurich) expect(text).toBe('26 Oct 2026')
    if (inLosAngeles) expect(text).toBe('25 Oct 2026')
  })

  it('formats the short style with a four-digit year', () => {
    expect(
      norm(
        formatInstant('2026-10-26T17:05:00Z', {
          ...enUS,
          timeZone: viewerTimeZone(),
          style: 'short',
        }),
      ),
    ).toBe(inZurich ? '10/26/2026, 6:05 PM' : '10/26/2026, 10:05 AM')
  })

  it('treats null, empty and DateTimeOffset.MinValue as no value', () => {
    expect(formatInstant(null, enGB)).toBe('')
    expect(formatInstant('', enGB)).toBe('')
    expect(formatInstant('0001-01-01T00:00:00+00:00', enGB)).toBe('')
  })

  it('returns a value without an offset unchanged: it is not an instant', () => {
    expect(formatInstant('2026-10-21T10:00:00', enGB)).toBe(
      '2026-10-21T10:00:00',
    )
    expect(formatInstant('2026-10-21', enGB)).toBe('2026-10-21')
  })

  it('returns a value with an out-of-range offset unchanged', () => {
    expect(formatInstant('2026-10-21T10:00:00+00:60', enGB)).toBe(
      '2026-10-21T10:00:00+00:60',
    )
    expect(formatInstant('2026-10-21T10:00:00+24:00', enGB)).toBe(
      '2026-10-21T10:00:00+24:00',
    )
    expect(formatInstant('2026-10-21T10:00:00-99:00', enGB)).toBe(
      '2026-10-21T10:00:00-99:00',
    )
    expect(formatInstant('2026-10-21T10:00:00+23:59', enGB)).toBe(
      formatInstant('2026-10-20T10:01:00Z', enGB),
    )
  })
})

describe('formatPlaceTime', () => {
  const zurich = { ...enGB, placeZone: 'Europe/Zurich' }
  // The place zone is labelled only for a viewer outside it.
  const label = (name: string) => (inZurich ? '' : ` ${name}`)

  it('shows the reading as written', () => {
    expect(formatPlaceTime('2026-10-26T10:00:00', zurich)).toBe(
      `26 Oct 2026, 10:00${label('CET')}`,
    )
    expect(formatPlaceTime('2026-10-26T10:00', zurich)).toBe(
      `26 Oct 2026, 10:00${label('CET')}`,
    )
  })

  it('labels a reading across the 2026-10-25 fall-back with the right side of it', () => {
    expect(formatPlaceTime('2026-10-25T01:30:00', zurich)).toBe(
      `25 Oct 2026, 01:30${label('CEST')}`,
    )
    expect(formatPlaceTime('2026-10-25T03:30:00', zurich)).toBe(
      `25 Oct 2026, 03:30${label('CET')}`,
    )
  })

  it('takes the earlier occurrence of the repeated hour on 2026-10-25, as the server does', () => {
    expect(formatPlaceTime('2026-10-25T02:30:00', zurich)).toBe(
      `25 Oct 2026, 02:30${label('CEST')}`,
    )
  })

  it('labels a reading across the 2027-03-28 spring-forward with the right side of it', () => {
    expect(formatPlaceTime('2027-03-28T01:30:00', zurich)).toBe(
      `28 Mar 2027, 01:30${label('CET')}`,
    )
    expect(formatPlaceTime('2027-03-28T03:30:00', zurich)).toBe(
      `28 Mar 2027, 03:30${label('CEST')}`,
    )
  })

  it('never moves a reading in the skipped hour of 2027-03-28', () => {
    expect(formatPlaceTime('2027-03-28T02:30:00', zurich)).toMatch(
      /^28 Mar 2027, 02:30/,
    )
  })

  it('labels a place west of the viewer, in the UI language', () => {
    const losAngeles = { ...enUS, placeZone: 'America/Los_Angeles' }
    const west = (name: string) => (inLosAngeles ? '' : ` ${name}`)
    expect(norm(formatPlaceTime('2026-11-01T01:30:00', losAngeles))).toBe(
      `Nov 1, 2026, 1:30 AM${west('PDT')}`,
    )
    expect(norm(formatPlaceTime('2026-11-01T03:00:00', losAngeles))).toBe(
      `Nov 1, 2026, 3:00 AM${west('PST')}`,
    )
    expect(
      formatPlaceTime('2026-10-26T10:00:00', {
        ...deCH,
        placeZone: 'Europe/Zurich',
      }),
    ).toBe(`26.10.2026, 10:00${label('MEZ')}`)
  })

  it('omits the label when only the date is shown', () => {
    expect(
      formatPlaceTime('2026-10-26T10:00:00', { ...zurich, dateOnly: true }),
    ).toBe('26 Oct 2026')
  })

  it('formats the short style with a four-digit year', () => {
    expect(
      formatPlaceTime('2026-10-26T10:00:00', { ...zurich, style: 'short' }),
    ).toBe(`26/10/2026, 10:00${label('CET')}`)
  })

  it('treats null, empty and DateTime.MinValue as no value', () => {
    expect(formatPlaceTime(undefined, zurich)).toBe('')
    expect(formatPlaceTime('', zurich)).toBe('')
    expect(formatPlaceTime('0001-01-01T00:00:00', zurich)).toBe('')
  })

  it('returns a value with an offset unchanged: it is not a local reading', () => {
    expect(formatPlaceTime('2026-10-26T10:00:00+01:00', zurich)).toBe(
      '2026-10-26T10:00:00+01:00',
    )
    expect(formatPlaceTime('2026-10-26T25:00:00', zurich)).toBe(
      '2026-10-26T25:00:00',
    )
  })
})

describe('formatTimeOfDay', () => {
  it("follows the locale's 12- or 24-hour clock", () => {
    expect(formatTimeOfDay('09:00:00', enGB)).toBe('09:00')
    expect(formatTimeOfDay('09:00:00', deCH)).toBe('09:00')
    expect(norm(formatTimeOfDay('09:00:00', enUS))).toBe('9:00 AM')
    expect(norm(formatTimeOfDay('13:05', enUS))).toBe('1:05 PM')
    expect(norm(formatTimeOfDay('00:00:00', enUS))).toBe('12:00 AM')
  })

  it('drops seconds and any fraction', () => {
    expect(formatTimeOfDay('23:59:59.9999999', enGB)).toBe('23:59')
  })

  it('returns an impossible time unchanged and an empty one as empty', () => {
    expect(formatTimeOfDay('24:00:00', enGB)).toBe('24:00:00')
    expect(formatTimeOfDay(null, enGB)).toBe('')
    expect(formatTimeOfDay('', enGB)).toBe('')
  })
})

describe('formatDateRange', () => {
  it('collapses the shared parts of the two dates', () => {
    expect(norm(formatDateRange('2026-10-21', '2026-10-25', enGB))).toBe(
      '21 – 25 Oct 2026',
    )
    expect(norm(formatDateRange('2026-10-21', '2026-10-25', deCH))).toBe(
      '21.–25.10.2026',
    )
    expect(norm(formatDateRange('2026-10-21', '2026-10-21', enGB))).toBe(
      '21 Oct 2026',
    )
  })

  it('spans the DST changes without shifting either end', () => {
    expect(norm(formatDateRange('2026-10-24', '2027-03-28', enGB))).toBe(
      '24 Oct 2026 – 28 Mar 2027',
    )
  })

  it('writes both years in full in the short style', () => {
    expect(
      norm(
        formatDateRange('2026-12-30', '2027-01-02', {
          ...enUS,
          style: 'short',
        }),
      ),
    ).toBe('12/30/2026 – 1/2/2027')
    expect(
      norm(
        formatDateRange('2026-10-21', '2026-10-25', {
          ...deCH,
          style: 'short',
        }),
      ),
    ).toBe('21.–25.10.2026')
  })

  it('shows an open side as the range separator alone', () => {
    expect(norm(formatDateRange('2026-10-21', '', enGB))).toBe('21 Oct 2026 –')
    expect(norm(formatDateRange(null, '2026-10-25', enGB))).toBe(
      '– 25 Oct 2026',
    )
    expect(norm(formatDateRange(undefined, null, enGB))).toBe('')
  })

  it('leaves out the era both ends share', () => {
    const japanese = { locale: 'en-US-u-ca-japanese' }
    expect(norm(formatDateRange('2026-10-21', null, japanese))).toBe(
      'Oct 21, 8 Reiwa –',
    )
    expect(norm(formatDateRange(null, '2026-10-25', japanese))).toBe(
      '– Oct 25, 8 Reiwa',
    )
  })

  it('writes the closing literal of a date once', () => {
    const ru = { locale: 'ru' }
    expect(norm(formatDateRange('2026-10-21', null, ru))).toBe(
      '21 окт. 2026 г. –',
    )
    expect(norm(formatDateRange(null, '2026-10-25', ru))).toBe(
      '– 25 окт. 2026 г.',
    )
    const ko = { locale: 'ko' }
    expect(norm(formatDateRange('2026-10-21', null, ko))).toBe(
      '2026. 10. 21. ~',
    )
    expect(norm(formatDateRange(null, '2026-10-25', ko))).toBe(
      '~ 2026. 10. 25.',
    )
  })
})

describe.each([
  ['Intl.DurationFormat', false],
  ['the fallback', true],
])('formatDuration with %s', (_, withoutDurationFormat) => {
  const intl = Intl as unknown as Record<string, unknown>
  const original = intl.DurationFormat

  beforeAll(() => {
    if (withoutDurationFormat) delete intl.DurationFormat
  })
  afterAll(() => {
    intl.DurationFormat = original
  })

  it('runs against the implementation it names', () => {
    expect(typeof intl.DurationFormat).toBe(
      withoutDurationFormat ? 'undefined' : 'function',
    )
  })

  it('formats hours and minutes in the given locale', () => {
    expect(formatDuration(90, enGB)).toBe('1 hr, 30 mins')
    expect(formatDuration(90, enUS)).toBe('1 hr, 30 min')
    expect(formatDuration(90, deCH)).toBe('1 Std., 30 Min.')
    expect(formatDuration(90, { ...enGB, style: 'long' })).toBe(
      '1 hour, 30 minutes',
    )
    expect(formatDuration(90, { ...enGB, style: 'narrow' })).toBe('1h 30m')
  })

  it('omits a zero unit, but never shows nothing', () => {
    expect(formatDuration(45, enGB)).toBe('45 mins')
    expect(formatDuration(120, enGB)).toBe('2 hrs')
    expect(formatDuration(0, enGB)).toBe('0 mins')
  })

  it('never rolls hours over into days', () => {
    expect(formatDuration(26 * 60, enGB)).toBe('26 hrs')
  })

  it('signs a negative duration once and rounds to whole minutes', () => {
    expect(formatDuration(-90, enGB)).toBe('-1 hr, 30 mins')
    expect(formatDuration(-30, enGB)).toBe('-30 mins')
    expect(formatDuration(89.6, enGB)).toBe('1 hr, 30 mins')
  })

  it('treats a missing or non-finite value as no value', () => {
    expect(formatDuration(null, enGB)).toBe('')
    expect(formatDuration(undefined, enGB)).toBe('')
    expect(formatDuration(Number.NaN, enGB)).toBe('')
  })
})
