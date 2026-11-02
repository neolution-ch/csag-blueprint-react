import dayjs from './dayjs'

/**
 * Conversions between the wire formats the form state holds and the strings Mantine's pickers
 * take and emit.
 *
 * - Local reading (a place's clock time): `YYYY-MM-DDTHH:mm:ss` on the wire, no offset.
 *   Mantine's `DateTimePicker` speaks `YYYY-MM-DD HH:mm:ss`.
 * - Time of day: `HH:mm:ss` on the wire. Mantine's `TimePicker` emits `HH:mm` unless it shows
 *   seconds, and `''` when cleared.
 */

const LOCAL_READING =
  /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/
const WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/i
const TIME_OF_DAY = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/

/** True for an ISO 8601 date-time that carries `Z` or an offset: an instant, not a reading. */
export function hasOffset(value: string | null | undefined): boolean {
  return typeof value === 'string' && WITH_OFFSET.test(value)
}

/**
 * The `DateTimePicker` value for a form value.
 *
 * A value with an offset is an instant. The only zone the form kit knows is the viewer's, so
 * it is shown as the viewer's clock reading, the same reading the rest of the UI shows for an
 * instant. Anything else that is not a local reading shows as empty.
 */
export function toPickerDateTime(
  value: string | null | undefined,
): string | null {
  if (!value) return null
  const m = LOCAL_READING.exec(value)
  if (m) return `${m[1]} ${m[2]}:${m[3]}:${m[4] || '00'}`
  if (hasOffset(value)) {
    // Fractions beyond milliseconds are not part of the ECMAScript date-time format.
    const instant = dayjs(new Date(value.replace(/\.\d+/, '')))
    return instant.isValid() ? instant.format('YYYY-MM-DD HH:mm:ss') : null
  }
  return null
}

/** The form value for a `DateTimePicker` value: a local reading, or null. */
export function toLocalReading(
  pickerValue: string | null | undefined,
): string | null {
  if (!pickerValue) return null
  const m = LOCAL_READING.exec(pickerValue)
  return m ? `${m[1]}T${m[2]}:${m[3]}:${m[4] || '00'}` : null
}

/**
 * `HH:mm:ss` for any accepted time of day, or null. Used in both directions: the `TimePicker`
 * takes the same string the form holds.
 */
export function toTimeOfDay(value: string | null | undefined): string | null {
  if (!value) return null
  const m = TIME_OF_DAY.exec(value)
  if (!m) return null
  const seconds = m[3] || '00'
  if (Number(m[1]) > 23 || Number(m[2]) > 59 || Number(seconds) > 59) {
    return null
  }
  return `${m[1]}:${m[2]}:${seconds}`
}
