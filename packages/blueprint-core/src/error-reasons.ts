/**
 * Every message in a Problem Details `errors` member, in order and without duplicates.
 *
 * Reads both shapes a .NET backend sends: the FastEndpoints array of `{ name, reason }` entries,
 * and the RFC 9457 dictionary that ASP.NET Core's `ValidationProblemDetails` uses, which maps
 * each field to an array of messages. Only the messages are returned, not the names they are
 * keyed by.
 *
 * FastEndpoints copies a reason into `detail` only when there is exactly one, so for a refusal
 * with several reasons this is the only place the server's explanation is found. Duplicates are
 * dropped because the backend allows the same reason to be added more than once.
 *
 * ```json
 * {
 *   "status": 400,
 *   "title": "Bad Request",
 *   "errors": [
 *     { "name": "generalErrors", "reason": "Cannot delete a pedalo with reservations." },
 *     { "name": "generalErrors", "reason": "Cannot delete a pedalo with maintenance records." }
 *   ]
 * }
 * ```
 */
export function collectErrorReasons(problem: unknown): string[] {
  if (typeof problem !== 'object' || problem === null) return []

  const { errors } = problem as { errors?: unknown }
  let candidates: unknown[] = []
  if (Array.isArray(errors)) {
    candidates = errors.map((entry: unknown) =>
      typeof entry === 'object' && entry !== null
        ? (entry as { reason?: unknown }).reason
        : entry,
    )
  } else if (typeof errors === 'object' && errors !== null) {
    candidates = Object.values(errors as Record<string, unknown>).flat()
  }

  const reasons = new Set<string>()
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const reason = candidate.trim()
    if (reason) reasons.add(reason)
  }
  return [...reasons]
}
