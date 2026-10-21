import { DateInput, useDatesContext } from '@mantine/dates'
import type { DateInputProps } from '@mantine/dates'
import { useFieldContext } from '../form-context'
import { useSelector } from '@tanstack/react-store'
import { datePattern, parseDateInput } from './date-formats'

type Props = Omit<DateInputProps, 'value' | 'onChange' | 'onBlur' | 'error'>

/**
 * Date-only field — stores an ISO date string ("YYYY-MM-DD") in the form state,
 * matching the format expected by the API and Orval-generated zod.iso.date() schemas.
 *
 * The input shows and accepts the date in the `DatesProvider` locale's numeric
 * form (DD.MM.YYYY for de-CH, MM/DD/YYYY for en-US) unless `valueFormat` is
 * given. Typed input is parsed with whichever format is shown.
 */
export default function DateInputField({
    valueFormat,
    locale,
    ...props
}: Props) {
    const field = useFieldContext<string | null>()
    const submissionAttempts = useSelector(
        field.form.store,
        (s) => s.submissionAttempts,
    )
    const dates = useDatesContext()
    const resolvedLocale = dates.getLocale(locale)
    const format = valueFormat ?? datePattern(resolvedLocale)
    // A function format can only display; typed input then has to be ISO.
    const parseFormat = typeof format === 'string' ? format : 'YYYY-MM-DD'

    return (
        <DateInput
            id={field.name}
            name={field.name}
            value={field.state.value ?? null}
            onBlur={field.handleBlur}
            onChange={(value) => field.handleChange(value)}
            locale={locale}
            valueFormat={format}
            dateParser={(input) =>
                parseDateInput(input, parseFormat, resolvedLocale)
            }
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
