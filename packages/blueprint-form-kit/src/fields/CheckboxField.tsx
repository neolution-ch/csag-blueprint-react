import { Checkbox } from '@mantine/core'
import type { CheckboxProps } from '@mantine/core'
import { useFieldContext } from '../form-context'
import { useSelector } from '@tanstack/react-store'

type Props = Omit<CheckboxProps, 'checked' | 'onChange' | 'onBlur' | 'error'>

export default function CheckboxField(props: Props) {
    const field = useFieldContext<boolean>()
    const submissionAttempts = useSelector(
        field.form.store,
        (s) => s.submissionAttempts,
    )
    return (
        <Checkbox
            id={field.name}
            name={field.name}
            checked={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.currentTarget.checked)}
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
