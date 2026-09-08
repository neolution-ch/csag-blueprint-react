import { DateTimePicker } from '@mantine/dates'
import type { DateTimePickerProps } from '@mantine/dates'
import { useFieldContext } from '../form-context'
import { useSelector } from '@tanstack/react-store'

type Props = Omit<
    DateTimePickerProps,
    'value' | 'onChange' | 'onBlur' | 'error'
>

/** Format the local timezone offset as ±HH:MM (e.g. "+02:00", "-05:00", "+00:00"). */
function getLocalTimezoneOffset(): string {
    const offsetMinutes = new Date().getTimezoneOffset()
    const sign = offsetMinutes <= 0 ? '+' : '-'
    const abs = Math.abs(offsetMinutes)
    const hours = String(Math.floor(abs / 60)).padStart(2, '0')
    const minutes = String(abs % 60).padStart(2, '0')
    return `${sign}${hours}:${minutes}`
}

/**
 * DateTime field — stores an ISO 8601 datetime string with timezone offset
 * in the form state, matching the format expected by the API and
 * Orval-generated zod.iso.datetime() schemas (which require an offset).
 */
export default function DateTimeInputField(props: Props) {
    const field = useFieldContext<string | null>()
    const submissionAttempts = useSelector(
        field.form.store,
        (s) => s.submissionAttempts,
    )

    return (
        <DateTimePicker
            id={field.name}
            name={field.name}
            value={field.state.value ?? null}
            onBlur={field.handleBlur}
            onChange={(value) => {
                if (!value) {
                    field.handleChange(value)
                    return
                }
                // Mantine emits "YYYY-MM-DD HH:mm:ss" or with T separator.
                // Ensure T separator and append local timezone offset for ISO 8601 compliance.
                const withT = value.replace(' ', 'T')
                // Match +HH:MM, -HH:MM or Z — value already has an offset/UTC marker
                const hasOffset = /[+-]\d{2}:\d{2}$|Z$/.test(withT)
                const isoValue = hasOffset
                    ? withT
                    : `${withT}${getLocalTimezoneOffset()}`
                field.handleChange(isoValue)
            }}
            valueFormat="DD.MM.YYYY HH:mm"
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
