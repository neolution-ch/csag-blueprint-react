import { describe, expect, it } from 'vitest'
import {
  hasOffset,
  toLocalReading,
  toPickerDateTime,
  toTimeOfDay,
} from '../wire-values'

const viewerZone = new Intl.DateTimeFormat().resolvedOptions().timeZone

describe('local readings', () => {
  it.each([
    ['2026-10-26T10:00:00', '2026-10-26 10:00:00'],
    ['2026-10-26T10:00', '2026-10-26 10:00:00'],
    ['2026-10-26T10:00:00.0000000', '2026-10-26 10:00:00'],
    // The repeated hour on 2026-10-25 and the skipped hour on 2027-03-28 in Zurich.
    ['2026-10-25T02:30:00', '2026-10-25 02:30:00'],
    ['2027-03-28T02:30:00', '2027-03-28 02:30:00'],
  ])('passes %s to the picker as written', (value, expected) => {
    expect(toPickerDateTime(value)).toBe(expected)
  })

  it.each([
    ['2026-10-26 10:00:00', '2026-10-26T10:00:00'],
    ['2026-10-25 02:30:00', '2026-10-25T02:30:00'],
    ['2027-03-28 02:30:00', '2027-03-28T02:30:00'],
    ['2026-10-26 10:00', '2026-10-26T10:00:00'],
  ])(
    'emits the picker value %s as %s, without an offset',
    (value, expected) => {
      expect(toLocalReading(value)).toBe(expected)
    },
  )

  it('emits null for an empty picker', () => {
    expect(toLocalReading(null)).toBeNull()
    expect(toLocalReading('')).toBeNull()
  })

  it('round-trips a reading unchanged in any viewer zone', () => {
    for (const value of [
      '2026-10-25T01:30:00',
      '2026-10-25T02:30:00',
      '2026-10-25T03:30:00',
      '2027-03-28T01:30:00',
      '2027-03-28T02:30:00',
      '2027-03-28T03:30:00',
      '2026-11-01T01:30:00',
    ]) {
      expect(toLocalReading(toPickerDateTime(value))).toBe(value)
    }
  })
})

describe('values that carry an offset', () => {
  it('recognizes Z and numeric offsets', () => {
    expect(hasOffset('2026-10-26T09:00:00Z')).toBe(true)
    expect(hasOffset('2026-10-26T10:00:00+01:00')).toBe(true)
    expect(hasOffset('2026-10-26T10:00:00.1234567-07:00')).toBe(true)
    expect(hasOffset('2026-10-26T10:00:00')).toBe(false)
    expect(hasOffset(null)).toBe(false)
  })

  it("shows the instant as the viewer's clock reading", () => {
    const shown = toPickerDateTime('2026-10-26T09:00:00Z')
    if (viewerZone === 'Europe/Zurich') {
      expect(shown).toBe('2026-10-26 10:00:00')
    }
    if (viewerZone === 'America/Los_Angeles') {
      expect(shown).toBe('2026-10-26 02:00:00')
    }
    expect(toPickerDateTime('2026-10-26T10:00:00.1234567+01:00')).toBe(shown)
  })

  it('reads each offset for its own date, not for today', () => {
    // The value written for 25 October before the fall-back carries +02:00, the one after it
    // +01:00; both are 10:00 in Zurich.
    if (viewerZone === 'Europe/Zurich') {
      expect(toPickerDateTime('2026-10-24T10:00:00+02:00')).toBe(
        '2026-10-24 10:00:00',
      )
      expect(toPickerDateTime('2026-10-26T10:00:00+01:00')).toBe(
        '2026-10-26 10:00:00',
      )
    }
  })

  it('shows anything else as empty', () => {
    expect(toPickerDateTime('26.10.2026 10:00')).toBeNull()
    expect(toPickerDateTime('2026-10-26')).toBeNull()
    expect(toPickerDateTime('')).toBeNull()
    expect(toPickerDateTime(undefined)).toBeNull()
  })
})

describe('toTimeOfDay', () => {
  it('normalizes to HH:mm:ss', () => {
    expect(toTimeOfDay('09:30')).toBe('09:30:00')
    expect(toTimeOfDay('09:30:15')).toBe('09:30:15')
    expect(toTimeOfDay('23:59:59.9999999')).toBe('23:59:59')
    expect(toTimeOfDay('00:00')).toBe('00:00:00')
  })

  it('returns null for an empty or impossible time', () => {
    expect(toTimeOfDay('')).toBeNull()
    expect(toTimeOfDay(null)).toBeNull()
    expect(toTimeOfDay('24:00')).toBeNull()
    expect(toTimeOfDay('09:60')).toBeNull()
    expect(toTimeOfDay('9:30')).toBeNull()
  })
})
