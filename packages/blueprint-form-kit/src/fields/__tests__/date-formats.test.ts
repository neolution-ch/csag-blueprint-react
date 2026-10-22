import { describe, expect, it } from 'vitest'
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

  it('accepts single-digit days and months, and surrounding spaces', () => {
    expect(parseDateInput('1.2.2026', 'DD.MM.YYYY', 'de-CH')).toBe('2026-02-01')
    expect(parseDateInput(' 01.02.2026 ', 'DD.MM.YYYY', 'de-CH')).toBe(
      '2026-02-01',
    )
  })

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
    expect(parseDateInput('10/26/2026', 'DD.MM.YYYY', 'de-CH')).toBeNull()
    expect(parseDateInput('13/26/2026', 'MM/DD/YYYY', 'en-US')).toBeNull()
  })

  it('honours an escaped literal', () => {
    expect(parseDateInput('26.10.2026 г.', 'DD.MM.YYYY[ г.]', 'bg')).toBe(
      '2026-10-26',
    )
  })
})
