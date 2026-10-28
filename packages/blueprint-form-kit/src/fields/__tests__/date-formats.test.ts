import { describe, expect, it } from 'vitest'
import 'dayjs/locale/de'
import 'dayjs/locale/de-ch'
import 'dayjs/locale/en-gb'
import {
  datePattern,
  dateTimePattern,
  hourFormat,
  parseDateInput,
  timePattern,
} from '../date-formats'

describe('datePattern', () => {
  it.each([
    ['de-CH', 'DD.MM.YYYY'],
    ['de-ch', 'DD.MM.YYYY'],
    ['fr-CH', 'DD.MM.YYYY'],
    ['it-CH', 'DD.MM.YYYY'],
    ['en-GB', 'DD/MM/YYYY'],
    ['en-US', 'MM/DD/YYYY'],
    ['en', 'MM/DD/YYYY'],
    ['ja', 'YYYY/MM/DD'],
    ['ko', 'YYYY. MM. DD.'],
  ])('derives %s as %s', (locale, expected) => {
    expect(datePattern(locale)).toBe(expected)
  })

  it('escapes literal letters so dayjs does not read them as tokens', () => {
    expect(datePattern('bg')).toBe('DD.MM.YYYY[ г.]')
  })

  it('falls back to ISO for a locale Intl cannot read', () => {
    expect(datePattern('not a locale')).toBe('YYYY-MM-DD')
  })
})

describe('time patterns', () => {
  it("follows the locale's hour cycle", () => {
    expect(hourFormat('de-CH')).toBe('24h')
    expect(hourFormat('en-GB')).toBe('24h')
    expect(hourFormat('en-US')).toBe('12h')
    expect(timePattern('de-CH')).toBe('HH:mm')
    expect(timePattern('en-US')).toBe('h:mm A')
    expect(timePattern('ko')).toBe('A h:mm')
    expect(timePattern('en-US', true)).toBe('h:mm:ss A')
  })

  it('joins the date and the time', () => {
    expect(dateTimePattern('de-CH')).toBe('DD.MM.YYYY HH:mm')
    expect(dateTimePattern('en-US')).toBe('MM/DD/YYYY h:mm A')
    expect(dateTimePattern('en-GB', true)).toBe('DD/MM/YYYY HH:mm:ss')
  })
})

describe('parseDateInput', () => {
  it('parses with the format the field shows', () => {
    expect(parseDateInput('26.10.2026', 'DD.MM.YYYY', 'de-CH')).toBe(
      '2026-10-26',
    )
    expect(parseDateInput('10/26/2026', 'MM/DD/YYYY', 'en-US')).toBe(
      '2026-10-26',
    )
    expect(parseDateInput('26/10/2026', 'DD/MM/YYYY', 'en-GB')).toBe(
      '2026-10-26',
    )
    expect(parseDateInput('2026/10/26', 'YYYY/MM/DD', 'de-CH')).toBe(
      '2026-10-26',
    )
  })

  it.each([
    ['01.02.2026', 'DD.MM.YYYY', 'de-CH'],
    ['1.02.2026', 'DD.MM.YYYY', 'de-CH'],
    ['01.2.2026', 'DD.MM.YYYY', 'de-CH'],
    ['1.2.2026', 'DD.MM.YYYY', 'de-CH'],
    [' 01.02.2026 ', 'DD.MM.YYYY', 'de-CH'],
    ['1/02/2026', 'DD/MM/YYYY', 'en-GB'],
    ['01/2/2026', 'DD/MM/YYYY', 'en-GB'],
    ['2/1/2026', 'MM/DD/YYYY', 'en-US'],
    ['02/1/2026', 'MM/DD/YYYY', 'en-US'],
    ['2/01/2026', 'MM/DD/YYYY', 'en-US'],
  ])(
    'reads %j with any mix of leading zeros as 1 February (%s)',
    (input, format, locale) => {
      expect(parseDateInput(input, format, locale)).toBe('2026-02-01')
    },
  )

  it.each([
    ['2026-10-25', '25.10.2026'],
    ['2027-03-28', '28.03.2027'],
  ])('parses the DST date %s without shifting it', (expected, input) => {
    expect(parseDateInput(input, 'DD.MM.YYYY', 'de-CH')).toBe(expected)
  })

  it('rejects incomplete and impossible dates instead of guessing', () => {
    expect(parseDateInput('26.10.20', 'DD.MM.YYYY', 'de-CH')).toBeNull()
    expect(parseDateInput('26.10.', 'DD.MM.YYYY', 'de-CH')).toBeNull()
    expect(parseDateInput('31.02.2026', 'DD.MM.YYYY', 'de-CH')).toBeNull()
    expect(parseDateInput('31.2.2026', 'DD.MM.YYYY', 'de-CH')).toBeNull()
    expect(parseDateInput('31/02/2026', 'DD/MM/YYYY', 'en-GB')).toBeNull()
    expect(parseDateInput('2/31/2026', 'MM/DD/YYYY', 'en-US')).toBeNull()
    expect(parseDateInput('10/26/2026', 'DD.MM.YYYY', 'de-CH')).toBeNull()
    expect(parseDateInput('13/26/2026', 'MM/DD/YYYY', 'en-US')).toBeNull()
  })

  it('honours an escaped literal', () => {
    expect(parseDateInput('26.10.2026 г.', 'DD.MM.YYYY[ г.]', 'bg')).toBe(
      '2026-10-26',
    )
  })

  it('reads month names in a dayjs locale registered under a lower-case key', () => {
    // The locale files register `de-ch` and `en-gb`; the DatesProvider hands over `de-CH`.
    expect(parseDateInput('25 Okt. 2026', 'DD MMM YYYY', 'de-CH')).toBe(
      '2026-10-25',
    )
    expect(parseDateInput('5 März 2027', 'DD MMM YYYY', 'de-CH')).toBe(
      '2027-03-05',
    )
    expect(parseDateInput('25 October 2026', 'D MMMM YYYY', 'en-GB')).toBe(
      '2026-10-25',
    )
  })

  it('falls back to the language, then to the global locale', () => {
    // No `de-at` file is loaded; `de` is.
    expect(parseDateInput('25 Sept. 2026', 'DD MMM YYYY', 'de-AT')).toBe(
      '2026-09-25',
    )
    expect(parseDateInput('25 Oct 2026', 'DD MMM YYYY', 'xx-YY')).toBe(
      '2026-10-25',
    )
  })

  it('never mistakes an inherited property for a registered locale', () => {
    for (const locale of ['constructor', 'toString', '__proto__']) {
      expect(parseDateInput('25 Oct 2026', 'DD MMM YYYY', locale)).toBe(
        '2026-10-25',
      )
    }
  })
})
