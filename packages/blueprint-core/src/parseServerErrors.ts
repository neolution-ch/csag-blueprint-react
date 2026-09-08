import { isProblemDetails } from '#/integrations/tanstack-query/problemDetailsUtils'

interface ServerValidationError {
  name: string
  reason: string
}

export interface ParsedServerErrors {
  fieldErrors: Record<string, string[]>
  formErrors: string[]
}

/**
 * Convert a PascalCase dot-separated path to camelCase.
 * "SubTest2.Prop1" → "subTest2.prop1"
 */
function toCamelCase(path: string): string {
  return path
    .split('.')
    .map((segment) => segment.charAt(0).toLowerCase() + segment.slice(1))
    .join('.')
}

/**
 * Parse a FastEndpoints error response into field-level and form-level errors.
 *
 * Used by `useSchemaForm` to automatically map server validation errors back onto
 * the form. This is part of our workaround for TanStack Form lacking built-in
 * support for setting field errors from `onSubmit`.
 * See: https://github.com/TanStack/form/discussions/623
 *
 * Expected response shape (FastEndpoints default):
 * ```json
 * {
 *   "errors": [
 *     { "name": "generalErrors", "reason": "Some form-level message" },
 *     { "name": "capacity", "reason": "Capacity must be positive" },
 *     { "name": "SubTest2.Prop1", "reason": "..." }
 *   ]
 * }
 * ```
 *
 * Any 4xx carrying that shape is mapped — not just 400. Endpoints send AddError-driven
 * refusals as 409 (e.g. "already a member", "account disabled") or 404 with the same body,
 * and a form that only mapped 400s would swallow those silently: the mutation suppresses
 * the global toast because the form owns error display, so an unmapped refusal produced
 * no feedback at all.
 *
 * - `generalErrors` entries → `formErrors` (displayed as a banner via ServerErrorAlert)
 * - All other entries → `fieldErrors` keyed by camelCase field path
 * - Returns null for anything else (5xx, network errors, bodies without `errors`) — those
 *   are rethrown by the form kit for the global handler
 */
export function parseServerErrors(error: unknown): ParsedServerErrors | null {
  if (!isProblemDetails(error) || error.status < 400 || error.status >= 500)
    return null

  const data = error as { errors?: unknown }
  if (!Array.isArray(data.errors)) return null

  const fieldErrors: Record<string, string[]> = {}
  const formErrors: string[] = []

  for (const entry of data.errors) {
    const { name, reason } = entry as ServerValidationError
    if (typeof name !== 'string' || typeof reason !== 'string') continue

    if (!name || name === 'generalErrors') {
      formErrors.push(reason)
    } else {
      const key = toCamelCase(name)
      ;(fieldErrors[key] ??= []).push(reason)
    }
  }

  return { fieldErrors, formErrors }
}
