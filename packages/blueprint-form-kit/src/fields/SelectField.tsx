import { Select } from '@mantine/core'
import type { SelectProps } from '@mantine/core'
import { useFieldContext } from '../form-context'
import { useSelector } from '@tanstack/react-store'

type Props = Omit<SelectProps, 'value' | 'onChange' | 'onBlur' | 'error'>

export default function SelectField(props: Props) {
    const field = useFieldContext<string | null>()
    const submissionAttempts = useSelector(
        field.form.store,
        (s) => s.submissionAttempts,
    )
    return (
        <Select
            id={field.name}
            name={field.name}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(value) => field.handleChange(value)}
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
