import Axios from 'axios'
import {
  collectErrorReasons,
  isProblemDetails,
  toProblemDetails,
} from '@collana-solutions/blueprint-core'
import type { ProblemDetails } from '@collana-solutions/blueprint-core'

/** Every user-visible string the error toast renders. */
export interface ErrorNotificationLabels {
  /**
   * Toast title for a failure on the server's side (5xx), a request that got no response, and
   * any error without an HTTP status.
   */
  title: string
  /**
   * Toast title when the server refused the request (4xx): a business rule, a conflict, a
   * missing permission. Those are answers the user can act on, so they are not titled as if
   * something broke.
   */
  rejectedTitle: string
  /** Body used when the server sent no usable detail. */
  genericMessage: string
  /** Prefix for the trace identifier, in the body and in the copied text. */
  traceIdLabel: string
  /** Label and aria-label of the copy control. */
  copy: string
  /** Tooltip shown for a moment after copying. */
  copied: string
}

export const defaultErrorNotificationLabels: ErrorNotificationLabels = {
  title: 'Something went wrong',
  rejectedTitle: 'Could not complete the request',
  genericMessage: 'Please try again.',
  traceIdLabel: 'Trace ID',
  copy: 'Copy error details',
  copied: 'Copied',
}

/** The text of one error toast, before it is laid out. */
export interface ErrorNotificationContent {
  title: string
  /** The explanation, followed by the trace id on its own line when there is one. */
  message: string
  /** What the copy control puts on the clipboard; absent when there is no problem to report. */
  clipboardText?: string
}

/**
 * Resolve a ProblemDetails from whatever error shape we receive:
 * 1. AxiosError with response.data as ProblemDetails (from interceptors)
 * 2. AxiosError without ProblemDetails body (network error) — normalize it
 * 3. Already a ProblemDetails (from React Query hooks — mutator extracts it)
 *
 * IMPORTANT: Check AxiosError FIRST because axios v1+ adds a `status`
 * property to AxiosError, which makes isProblemDetails(axiosError) true.
 */
function resolveProblem(error: unknown): ProblemDetails | undefined {
  if (Axios.isAxiosError(error)) {
    const data: unknown = error.response?.data
    return isProblemDetails(data) ? data : toProblemDetails(error)
  }
  return isProblemDetails(error) ? error : undefined
}

function firstText(
  ...candidates: Array<string | null | undefined>
): string | undefined {
  return candidates.find(
    (candidate): candidate is string =>
      typeof candidate === 'string' && candidate.trim().length > 0,
  )
}

function buildClipboardText(
  text: ErrorNotificationLabels,
  problem: {
    title?: string
    status?: number
    detail?: string | null
    traceId?: string
    exception?: string
  },
  reasons: string[],
): string {
  const lines: string[] = []
  if (problem.title) lines.push(`Title: ${problem.title}`)
  if (problem.status) lines.push(`Status: ${problem.status}`)
  if (problem.detail) lines.push(`Detail: ${problem.detail}`)
  const unlistedReasons = reasons.filter((reason) => reason !== problem.detail)
  if (unlistedReasons.length > 0) {
    lines.push('Errors:', ...unlistedReasons.map((reason) => `- ${reason}`))
  }
  if (problem.traceId) lines.push(`${text.traceIdLabel}: ${problem.traceId}`)
  if (problem.exception) lines.push(`\nException:\n${problem.exception}`)
  return lines.join('\n')
}

/**
 * Work out what the error toast says for an error of any shape.
 *
 * The body is the server's `detail`, else the reasons in its `errors` (one per line), else its
 * `title`. That middle step matters for FastEndpoints, which omits `detail` whenever a refusal
 * has more than one reason, leaving only a bare "Bad Request" title behind.
 */
export function describeErrorNotification(
  error: unknown,
  text: ErrorNotificationLabels,
): ErrorNotificationContent {
  const problem = resolveProblem(error)
  const reasons = collectErrorReasons(problem)

  // Only surface server-provided text when a real HTTP response came back.
  // Network errors and locally-thrown JS errors fall back to a generic message
  // so internal exception strings never reach the user.
  const hasServerResponse = problem !== undefined && problem.status > 0
  const isRefusal =
    hasServerResponse && problem.status >= 400 && problem.status < 500

  const body =
    (hasServerResponse
      ? firstText(problem.detail, reasons.join('\n'), problem.title)
      : undefined) ?? text.genericMessage
  const traceId =
    problem?.traceId && problem.traceId !== 'n/a' ? problem.traceId : undefined

  return {
    title: isRefusal ? text.rejectedTitle : text.title,
    message: traceId ? `${body}\n${text.traceIdLabel}: ${traceId}` : body,
    clipboardText: problem
      ? buildClipboardText(text, problem, reasons)
      : undefined,
  }
}
