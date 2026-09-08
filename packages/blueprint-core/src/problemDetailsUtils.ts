import type { AxiosError } from 'axios'

/** RFC 9457 Problem Details shape returned by ASP.NET Core. */
export interface ProblemDetails {
  type?: string
  title?: string
  status: number
  detail?: string | null
  traceId?: string
  instance?: string | null
  errors?: Array<{ name: string; reason: string }> | null
  [key: string]: unknown
}

/** Type guard that checks if a value looks like a ProblemDetails object. */
export function isProblemDetails(value: unknown): value is ProblemDetails {
  return (
    typeof value === 'object' &&
    value !== null &&
    'status' in value &&
    typeof (value as ProblemDetails).status === 'number'
  )
}

/**
 * Convert an AxiosError (network or non-ProblemDetails response) into
 * a ProblemDetails-shaped object so consumers always see the same type.
 */
export function toProblemDetails(error: AxiosError): ProblemDetails {
  return {
    type: 'about:blank',
    title: error.code ?? 'Network Error',
    status: error.response?.status ?? 0,
    traceId:
      (error.response?.headers['x-correlation-id'] as string | undefined) ??
      'n/a',
    detail: error.message,
  }
}
