import Axios from 'axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import {
  isProblemDetails,
  toProblemDetails,
} from '#/integrations/tanstack-query/problemDetailsUtils'

/**
 * Dedicated axios instance for Orval-generated React Query hooks.
 *
 * Only the 401 interceptor is registered here — React Query's
 * `QueryCache.onError` and `MutationCache.onError` handle all other
 * error notifications.
 *
 * @see orval-axios-instance.ts for the raw axios instance with full error handling.
 */
export const orvalReactQueryInstance = Axios.create()

// Match the same CSRF config as the global instance (axios-setup.ts).
orvalReactQueryInstance.defaults.xsrfCookieName = 'XSRF-TOKEN'
orvalReactQueryInstance.defaults.xsrfHeaderName = 'X-CSRF-TOKEN'

/**
 * Endpoints where a 401 is a *domain* response — bad credentials, or a bad/missing
 * second factor — that the calling screen shows inline, rather than a session-expiry
 * redirect. The auto-redirect below is skipped for these so the form can surface the
 * error (e.g. a wrong TOTP code on the MFA challenge must not bounce to /auth/login
 * and drop the pending two-factor cookie).
 */
const inlineUnauthorizedPaths = ['/api/auth/login', '/api/auth/mfa/login']

// 401 interceptor — session expiry must be handled universally.
orvalReactQueryInstance.interceptors.response.use(
  undefined,
  (error: unknown) => {
    if (Axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? ''
      const handledInline = inlineUnauthorizedPaths.some((path) =>
        url.endsWith(path),
      )
      if (!handledInline && typeof window !== 'undefined') {
        window.location.href = '/auth/login'
      }
    }
    return Promise.reject(error)
  },
)

/**
 * Custom mutator for Orval (React Query output).
 *
 * Transforms AxiosErrors into ProblemDetails so that the error type matches
 * what Orval generates (`TError = ProblemDetails`). Server responses that
 * already contain Problem Details are extracted directly; network errors
 * are normalized into a ProblemDetails shape for consistent handling.
 */
export const orvalReactQueryMutator = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => {
  return orvalReactQueryInstance({ ...config, ...options }).catch(
    (error: unknown) => {
      if (Axios.isAxiosError(error)) {
        const data = error.response?.data
        if (isProblemDetails(data)) {
          throw data
        }
        // Network error or non-ProblemDetails response — normalize.
        throw toProblemDetails(error)
      }
      throw error
    },
  )
}

export default orvalReactQueryMutator
