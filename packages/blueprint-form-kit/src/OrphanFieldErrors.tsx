import { Alert, List } from '@mantine/core'
import { AlertTriangle } from 'lucide-react'
import { useFormContext } from './form-context'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useState } from 'react'
import { useT } from '#/translations'

/**
 * Renders validation errors for schema fields that have no corresponding
 * `<AppField>` in the UI. This catches the common mistake of using a
 * generated schema that has more fields than the form renders.
 *
 * Without this component, those errors are invisible to the user and the
 * form silently refuses to submit. In dev mode, useSchemaForm also logs
 * a console.warn for the same situation.
 *
 * Place this inside `<form.AppForm>`, typically next to `<form.ServerErrorAlert />`.
 */
export default function OrphanFieldErrors() {
    const form = useFormContext()
    const { common } = useT()
    const fieldMeta = useSelector(form.store, (s) => s.fieldMeta)
    const submissionAttempts = useSelector(
        form.store,
        (s) => s.submissionAttempts,
    )
    const [orphanErrors, setOrphanErrors] = useState<
        { field: string; errors: string[] }[]
    >([])

    useEffect(() => {
        if (submissionAttempts === 0) return

        const result: { field: string; errors: string[] }[] = []
        for (const [key, meta] of Object.entries(fieldMeta)) {
            const typedMeta = meta as { errors: unknown[] } | undefined
            if (!typedMeta || typedMeta.errors.length === 0) continue
            if (!document.getElementById(key)) {
                result.push({
                    field: key,
                    errors: typedMeta.errors.map((err) => {
                        if (typeof err === 'string') return err
                        if (err && typeof err === 'object' && 'message' in err)
                            return String(err.message)
                        return JSON.stringify(err)
                    }),
                })
            }
        }
        setOrphanErrors(result)
    }, [fieldMeta, submissionAttempts])

    if (orphanErrors.length === 0) return null

    return (
        <Alert
            color="red"
            title={common.validationErrors}
            icon={<AlertTriangle size={16} />}
        >
            <List size="sm">
                {orphanErrors.map(({ field, errors }) =>
                    errors.map((err, i) => (
                        <List.Item key={`${field}-${i}`}>
                            <strong>{field}</strong>: {err}
                        </List.Item>
                    )),
                )}
            </List>
        </Alert>
    )
}
