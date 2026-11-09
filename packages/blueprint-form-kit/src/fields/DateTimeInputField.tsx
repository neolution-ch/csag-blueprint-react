import { useEffect } from 'react'
import { DateTimePicker, useDatesContext } from '@mantine/dates'
import type { DateTimePickerProps } from '@mantine/dates'
import { useFieldContext } from '../form-context'
import { useSelector } from '@tanstack/react-store'
import { isDevMode } from '../dev-mode'
import { dateTimePattern, hourFormat } from './date-formats'
import { hasOffset, toLocalReading, toPickerDateTime } from './wire-values'

type Props = Omit<
    DateTimePickerProps,
    'value' | 'onChange' | 'onBlur' | 'error'
>

const warnedFields = new Set<string>()

/**
 * Date-and-time field for a place's clock reading — stores a local reading
 * ("YYYY-MM-DDTHH:mm:ss", no offset) in the form state. The reading is the
 * truth; the server resolves it against the place's time zone.
 *
 * A value that carries an offset is an instant, not a reading. It is shown as
 * the viewer's clock reading and left untouched in the form state until the
 * user picks a new value, which is then emitted as a local reading.
 *
 * Mantine works on local `Date` objects internally, so a reading that falls in
 * a daylight-saving gap of the viewer's own zone (02:30 on a spring-forward
 * night) is moved an hour forward when the picker shows it.
 */
export default function DateTimeInputField({
    valueFormat,
    locale,
    withSeconds,
    timePickerProps,
    ...props
}: Props) {
    const field = useFieldContext<string | null>()
    const submissionAttempts = useSelector(
        field.form.store,
        (s) => s.submissionAttempts,
    )
    const dates = useDatesContext()
    const resolvedLocale = dates.getLocale(locale)
    const value = field.state.value

    useEffect(() => {
        if (isDevMode() && hasOffset(value) && !warnedFields.has(field.name)) {
            warnedFields.add(field.name)
            console.warn(
                `DateTimeInputField "${field.name}" received "${value}", which carries an offset. ` +
                    'The field holds local readings (YYYY-MM-DDTHH:mm:ss) and will emit one on the next change.',
            )
        }
    }, [field.name, value])

    return (
        <DateTimePicker
            id={field.name}
            name={field.name}
            value={toPickerDateTime(value)}
            onBlur={field.handleBlur}
            onChange={(next) => field.handleChange(toLocalReading(next))}
            locale={locale}
            withSeconds={withSeconds}
            valueFormat={
                valueFormat ??
                dateTimePattern(
                    resolvedLocale,
                    withSeconds ?? timePickerProps?.withSeconds,
                )
            }
            timePickerProps={{
                format: hourFormat(resolvedLocale),
                ...timePickerProps,
            }}
            error={
                (field.state.meta.isBlurred || submissionAttempts > 0) &&
                field.state.meta.errors.length > 0
                    ? field.state.meta.errors
                          .map(
                              (e) =>
                                  (e as { message?: string }).message ??
                                  String(e),
                          )
                          .join(', ')
                    : undefined
            }
            {...props}
        />
    )
}
