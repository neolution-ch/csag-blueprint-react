import Axios from 'axios'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'
import { showErrorNotification } from '#/integrations/tanstack-query/showErrorNotification'

/**
 * Dedicated axios instance for Orval-generated raw axios functions (no React Query).
 *
 * This instance handles ALL errors: 401 → redirect to login, everything else →
 * showErrorNotification(). This mirrors what React Query's QueryCache.onError and
 * mutations.onError do for the hook-based output, so both code paths get the same
 * error UX.
 *
 * Used by: the bootstrap (client/auth.ts, client/translations.ts) and other
 * imperative calls (lookup resolvers, export functions, DynamicTableView
 * preferences).
 *
 * @see orval-react-query-instance.ts for the React Query instance (401-only interceptor).
 */
export const orvalAxiosInstance = Axios.create()

// Match the same CSRF config as all other instances.
orvalAxiosInstance.defaults.xsrfCookieName = 'XSRF-TOKEN'
orvalAxiosInstance.defaults.xsrfHeaderName = 'X-CSRF-TOKEN'

// Full error interceptor — 401 redirect + notification for everything else.
orvalAxiosInstance.interceptors.response.use(undefined, (error: unknown) => {
  if (Axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      if (
        typeof window !== 'undefined' &&
        !error.config?.__suppressAuthRedirect
      ) {
        window.location.href = '/auth/login'
      }
    } else if (!error.config?.__suppressToast) {
      showErrorNotification(error)
    }
  }
  return Promise.reject(error)
})

/**
 * Custom mutator for Orval (raw axios output).
 */
export const orvalAxiosMutator = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<AxiosResponse<T>> => {
  return orvalAxiosInstance({ ...config, ...options })
}

export default orvalAxiosMutator
