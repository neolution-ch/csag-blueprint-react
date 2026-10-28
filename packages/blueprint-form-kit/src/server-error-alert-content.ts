import type { FormKitLabels } from './labels'

/** What `<form.ServerErrorAlert />` renders. */
export interface ServerErrorAlertContent {
  title: string
  messages: string[]
}

/**
 * A refused request (4xx) is something the user can act on; a 5xx, or 0 for a request that got
 * no response, is a failure on the server's side. No status at all counts as a refusal, because
 * that is what everything `useSchemaForm` maps onto the form is.
 */
function isRefusal(status: number | undefined): boolean {
  return status === undefined || (status >= 400 && status < 500)
}

/**
 * Interpret the form-level `errorMap.onServer` value, which arrives in one of three shapes:
 *
 * - a string: what `setErrorMap({ onServer: { form, fields } })` leaves in that slot, because
 *   TanStack Form keeps only `form` from an object that has `fields`. `useSchemaForm` writes this.
 * - `{ form, status? }`: an object without `fields` is stored whole, so this is the shape an app
 *   writes when it catches a server answer itself, and the only one that can carry a status.
 * - an array of strings.
 *
 * Returns undefined when there is nothing to show.
 */
export function getServerErrorAlertContent(
  onServer: unknown,
  labels: FormKitLabels,
): ServerErrorAlertContent | undefined {
  let messages: string[]
  let status: number | undefined

  if (Array.isArray(onServer)) {
    messages = onServer.filter(
      (message): message is string =>
        typeof message === 'string' && message.length > 0,
    )
  } else if (typeof onServer === 'object' && onServer !== null) {
    const value = onServer as { form?: unknown; status?: unknown }
    messages =
      typeof value.form === 'string' && value.form.length > 0
        ? [value.form]
        : []
    status = typeof value.status === 'number' ? value.status : undefined
  } else {
    messages = onServer ? [String(onServer)] : []
  }

  if (messages.length === 0) return undefined

  return {
    title: isRefusal(status) ? labels.requestRejected : labels.serverError,
    messages,
  }
}
