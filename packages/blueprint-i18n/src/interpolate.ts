/**
 * Replaces `{{key}}` occurrences in a template string with values from the params object.
 * Unknown keys pass through unchanged.
 */
export function interpolate(
  template: string,
  params: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match,
  )
}
