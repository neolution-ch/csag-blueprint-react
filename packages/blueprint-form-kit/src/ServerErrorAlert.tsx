import { Alert } from '@mantine/core'
import { AlertTriangle } from 'lucide-react'
import { useFormContext } from './form-context'
import { useSelector } from '@tanstack/react-store'
import { useFormKitLabels } from './labels'
import { getServerErrorAlertContent } from './server-error-alert-content'

/**
 * Renders a banner for form-level server errors (generalErrors from the API).
 * Subscribes to `form.state.errorMap.onServer` — automatically populated by
 * useSchemaForm when the onSubmit callback rejects with a 4xx carrying an `errors` array.
 *
 * Field-level server errors are handled automatically by TanStack Form's `setErrorMap`
 * with the `{ form, fields }` shape — they flow to each field's `errorMap` and render
 * via the standard field error display. This component only handles the form-level part.
 *
 * The title follows the status: `requestRejected` for a refused request (4xx), and
 * `serverError` for a 5xx or a request that got no response. An app that catches a server
 * answer itself passes the status beside the message, and leaves `fields` out so that
 * TanStack Form stores the object whole rather than keeping only `form`:
 *
 * ```ts
 * form.setErrorMap({ onServer: { form: message, status: error.status } } as never)
 * ```
 *
 * Without a status the banner uses `requestRejected`.
 *
 * Part of the server error workaround described in useSchemaForm.ts.
 * See: https://github.com/TanStack/form/discussions/623
 *
 * Place this inside `<form.AppForm>` or anywhere the form context is available.
 */
export default function ServerErrorAlert() {
    const form = useFormContext()
    const labels = useFormKitLabels()
    const onServer: unknown = useSelector(
        form.store,
        (s) => s.errorMap.onServer,
    )

    const content = getServerErrorAlertContent(onServer, labels)
    if (!content) return null

    return (
        <Alert
            color="red"
            title={content.title}
            icon={<AlertTriangle size={16} />}
        >
            {content.messages.join(' ')}
        </Alert>
    )
}
