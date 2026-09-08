import { Button } from '@mantine/core'
import type { ButtonProps } from '@mantine/core'
import { useFormContext } from './form-context'
import { useT } from '#/translations'

type Props = Omit<ButtonProps, 'type' | 'disabled' | 'loading'>

export default function SubmitButton(props: Props) {
    const form = useFormContext()
    const { common } = useT()
    return (
        <form.Subscribe
            selector={(state) => ({
                isSubmitting: state.isSubmitting,
                isValidating: state.isFieldsValidating,
            })}
            children={({ isSubmitting, isValidating }) => (
                <Button
                    type="submit"
                    disabled={isSubmitting || isValidating}
                    loading={isSubmitting || isValidating}
                    {...props}
                >
                    {props.children ?? common.submit}
                </Button>
            )}
        />
    )
}
