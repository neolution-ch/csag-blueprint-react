import { NumberInput } from '@mantine/core'
import type { NumberInputProps } from '@mantine/core'
import { useFieldContext } from '../form-context'
import { useSelector } from '@tanstack/react-store'

type Props = Omit<NumberInputProps, 'value' | 'onChange' | 'onBlur' | 'error'>

export default function NumberInputField(props: Props) {
    const field = useFieldContext<number | undefined>()
    const submissionAttempts = useSelector(
        field.form.store,
        (s) => s.submissionAttempts,
    )
    return (
        <NumberInput
            id={field.name}
            name={field.name}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(value) =>
                field.handleChange(
                    typeof value === 'number' ? value : undefined,
                )
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
