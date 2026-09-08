import { TextInput } from '@mantine/core'
import type { TextInputProps } from '@mantine/core'
import { useFieldContext } from '../form-context'
import { useSelector } from '@tanstack/react-store'

type Props = Omit<TextInputProps, 'value' | 'onChange' | 'onBlur' | 'error'>

export default function TextInputField(props: Props) {
    const field = useFieldContext<string>()
    const submissionAttempts = useSelector(
        field.form.store,
        (s) => s.submissionAttempts,
    )
    return (
        <TextInput
            id={field.name}
            name={field.name}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => field.handleChange(e.target.value)}
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
