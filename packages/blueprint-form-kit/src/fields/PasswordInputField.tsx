import { PasswordInput } from '@mantine/core'
import type { PasswordInputProps } from '@mantine/core'
import { useFieldContext } from '../form-context'
import { useSelector } from '@tanstack/react-store'
import { useFormKitLabels } from '../labels'

type Props = Omit<PasswordInputProps, 'value' | 'onChange' | 'onBlur' | 'error'>

export default function PasswordInputField(props: Props) {
    const field = useFieldContext<string>()
    const labels = useFormKitLabels()
    const submissionAttempts = useSelector(
        field.form.store,
        (s) => s.submissionAttempts,
    )
    return (
        <PasswordInput
            id={field.name}
            name={field.name}
            visibilityToggleButtonProps={{
                'aria-label': labels.togglePasswordVisibility,
            }}
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
