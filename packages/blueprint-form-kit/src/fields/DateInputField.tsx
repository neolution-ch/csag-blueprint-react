import dayjs from 'dayjs'
import { DateInput } from '@mantine/dates'
import type { DateInputProps } from '@mantine/dates'
import { useFieldContext } from '../form-context'
import { useSelector } from '@tanstack/react-store'

type Props = Omit<DateInputProps, 'value' | 'onChange' | 'onBlur' | 'error'>

/**
 * Date-only field — stores an ISO date string ("YYYY-MM-DD") in the form state,
 * matching the format expected by the API and Orval-generated zod.iso.date() schemas.
 * Mantine 8's DateInput natively works with string | null, so no conversion is needed.
 */
export default function DateInputField(props: Props) {
    const field = useFieldContext<string | null>()
    const submissionAttempts = useSelector(
        field.form.store,
        (s) => s.submissionAttempts,
    )

    return (
        <DateInput
            id={field.name}
            name={field.name}
            value={field.state.value ?? null}
            onBlur={field.handleBlur}
            onChange={(value) => field.handleChange(value)}
            valueFormat="DD.MM.YYYY"
            dateParser={(input) =>
                dayjs(input, 'DD.MM.YYYY').format('YYYY-MM-DD')
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
