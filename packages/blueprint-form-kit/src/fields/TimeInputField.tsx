import { TimePicker, useDatesContext } from '@mantine/dates'
import type { TimePickerProps } from '@mantine/dates'
import { useFieldContext } from '../form-context'
import { useSelector } from '@tanstack/react-store'
import { hourFormat } from './date-formats'
import { toTimeOfDay } from './wire-values'

type Props = Omit<TimePickerProps, 'value' | 'onChange' | 'onBlur' | 'error'>

/**
 * Time-of-day field — stores "HH:mm:ss" in the form state, the format
 * System.Text.Json writes for a `TimeOnly`. An incomplete or cleared input is
 * null.
 *
 * Shows a 12- or 24-hour clock following the `DatesProvider` locale unless
 * `format` is given. Mantine's `TimePicker` is used rather than `TimeInput`,
 * whose native `<input type="time">` follows the browser's locale instead of
 * the UI language.
 */
export default function TimeInputField({ format, ...props }: Props) {
    const field = useFieldContext<string | null>()
    const submissionAttempts = useSelector(
        field.form.store,
        (s) => s.submissionAttempts,
    )
    const dates = useDatesContext()

    return (
        <TimePicker
            id={field.name}
            name={field.name}
            value={toTimeOfDay(field.state.value) ?? ''}
            onBlur={field.handleBlur}
            onChange={(value) => field.handleChange(toTimeOfDay(value))}
            format={format ?? hourFormat(dates.locale)}
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
