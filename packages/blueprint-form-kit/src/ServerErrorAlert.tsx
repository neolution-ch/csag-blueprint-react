import { Alert } from '@mantine/core'
import { AlertTriangle } from 'lucide-react'
import { useFormContext } from './form-context'
import { useSelector } from '@tanstack/react-store'
import { useFormKitLabels } from './labels'

/**
 * Renders a banner for form-level server errors (generalErrors from the API).
 * Subscribes to `form.state.errorMap.onServer` — automatically populated by
 * useSchemaForm when the onSubmit callback rejects with a 400 validation response.
 *
 * Field-level server errors are handled automatically by TanStack Form's `setErrorMap`
 * with the `{ form, fields }` shape — they flow to each field's `errorMap` and render
 * via the standard field error display. This component only handles the form-level part.
 *
 * Part of the server error workaround described in useSchemaForm.ts.
 * See: https://github.com/TanStack/form/discussions/623
 *
 * Place this inside `<form.AppForm>` or anywhere the form context is available.
 */
export default function ServerErrorAlert() {
    const form = useFormContext()
    const labels = useFormKitLabels()
    const onServer = useSelector(form.store, (s) => s.errorMap.onServer) as
        { form?: string; fields?: Record<string, string> } | string | undefined

    if (!onServer) return null

    // setErrorMap stores server errors as { form?: string, fields: {...} }
    const formError =
        typeof onServer === 'object' && 'form' in onServer
            ? onServer.form
            : undefined
    const messages = formError
        ? [formError]
        : Array.isArray(onServer)
          ? (onServer as string[])
          : [String(onServer)]

    if (messages.length === 0) return null

    return (
        <Alert
            color="red"
            title={labels.serverError}
            icon={<AlertTriangle size={16} />}
        >
            {messages.join(' ')}
        </Alert>
    )
}
