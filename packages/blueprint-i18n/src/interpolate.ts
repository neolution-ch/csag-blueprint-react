/**
 * Replaces `{Key}` occurrences in a template string with values from the params object.
 * Unknown placeholders pass through unchanged.
 *
 * Single braces are the convention the whole blueprint stack speaks. Validation messages are
 * stored server-side with `{FieldName}`, `{Min}` and `{Max}` placeholders and the zod error
 * map fills that same syntax, so a translated string that still carries placeholders when it
 * reaches the UI is filled here under identical rules.
 *
 * The template is scanned once, so a value is inserted verbatim: braces or `$` sequences inside
 * it are never read as placeholders or replacement patterns. A `{{key}}` token is the
 * {@link interpolate} syntax and is left whole rather than half-filled. A placeholder with no
 * matching param is left in place: a missing value surfaces as `{Amount}` in the UI instead of
 * `undefined`.
 */
export function formatMessage(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(
    /\{\{[^{}]*\}\}|\{([^{}]+)\}/g,
    (match, key: string | undefined) =>
      key !== undefined && Object.hasOwn(values, key)
        ? String(values[key])
        : match,
  )
}

/**
 * Replaces `{{key}}` occurrences in a template string with values from the params object.
 * Unknown keys pass through unchanged.
 *
 * @deprecated Use {@link formatMessage}. Double braces are not the convention the backend
 * emits, so this never matched a blueprint translation string. It is kept for one minor
 * release so that any out-of-tree consumer which adopted it has somewhere to migrate from.
 */
export function interpolate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  )
}
