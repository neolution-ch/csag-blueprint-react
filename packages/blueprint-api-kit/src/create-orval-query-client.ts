import Axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import {
  isProblemDetails,
  toProblemDetails,
} from '@collana-solutions/blueprint-core'
import {
  DEFAULT_CSRF_COOKIE_NAME,
  DEFAULT_CSRF_HEADER_NAME,
  handleUnauthorized,
} from './options'
import type { BlueprintAxiosOptions } from './options'

export interface OrvalQueryClientOptions extends BlueprintAxiosOptions {
  /**
   * Endpoints where a 401 is a *domain* response — bad credentials, or a bad/missing
   * second factor — that the calling screen shows inline, rather than a session-expiry
   * redirect. The auto-redirect is skipped for these so the form can surface the error
   * (e.g. a wrong TOTP code on the MFA challenge must not bounce to the login page and
   * drop the pending two-factor cookie).
   *
   * Matched with `endsWith`, so pass full request paths.
   */
  inlineUnauthorizedPaths?: Array<string>
}

export interface OrvalQueryClient {
  instance: AxiosInstance
  /** Custom mutator for Orval (React Query output). */
  mutator: <T>(
    config: AxiosRequestConfig,
    options?: AxiosRequestConfig,
  ) => Promise<AxiosResponse<T>>
}

/**
 * Builds the axios instance for Orval-generated React Query hooks.
 *
 * Only the 401 interceptor is registered here — React Query's `QueryCache.onError` and
 * `MutationCache.onError` handle all other error notifications.
 *
 * The mutator transforms AxiosErrors into ProblemDetails so the error type matches what
 * Orval generates (`TError = ProblemDetails`). Server responses that already carry Problem
 * Details are extracted directly; network errors are normalized into the same shape for
 * consistent handling.
 *
 * @see createOrvalAxiosClient for the raw axios instance with full error handling.
 */
export function createOrvalQueryClient(
  options?: OrvalQueryClientOptions,
): OrvalQueryClient {
  const instance = Axios.create()

  // Match the same CSRF config as the global instance.
  instance.defaults.xsrfCookieName =
    options?.csrfCookieName ?? DEFAULT_CSRF_COOKIE_NAME
  instance.defaults.xsrfHeaderName =
    options?.csrfHeaderName ?? DEFAULT_CSRF_HEADER_NAME

  const inlineUnauthorizedPaths = options?.inlineUnauthorizedPaths ?? []

  // 401 interceptor — session expiry must be handled universally.
  instance.interceptors.response.use(undefined, (error: unknown) => {
    if (Axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? ''
      const handledInline = inlineUnauthorizedPaths.some((path) =>
        url.endsWith(path),
      )
      if (!handledInline) {
        handleUnauthorized(error, options)
      }
    }
    return Promise.reject(error)
  })

  const mutator = <T>(
    config: AxiosRequestConfig,
    requestOptions?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> =>
    instance({ ...config, ...requestOptions }).catch((error: unknown) => {
      if (Axios.isAxiosError(error)) {
        const data = error.response?.data
        if (isProblemDetails(data)) {
          throw data
        }
        // Network error or non-ProblemDetails response — normalize.
        throw toProblemDetails(error)
      }
      throw error
    })

  return { instance, mutator }
}
