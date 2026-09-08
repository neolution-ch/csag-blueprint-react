import Axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { showErrorNotification } from './show-error-notification'
import {
  DEFAULT_CSRF_COOKIE_NAME,
  DEFAULT_CSRF_HEADER_NAME,
  handleUnauthorized,
} from './options'
import type { BlueprintAxiosOptions } from './options'

export interface OrvalAxiosClient {
  instance: AxiosInstance
  /** Custom mutator for Orval (raw axios output). */
  mutator: <T>(
    config: AxiosRequestConfig,
    options?: AxiosRequestConfig,
  ) => Promise<AxiosResponse<T>>
}

/**
 * Builds the axios instance for Orval-generated raw axios functions (no React Query).
 *
 * This instance handles ALL errors: 401 → login redirect, everything else →
 * showErrorNotification(). That mirrors what React Query's QueryCache.onError and
 * mutations.onError do for the hook-based output, so both code paths get the same
 * error UX.
 *
 * Used by the bootstrap and other imperative calls — lookup resolvers, export
 * functions, saved-view preferences.
 *
 * Orval requires its mutator to be a local file path, so the consuming app keeps a thin
 * module that calls this and re-exports the mutator.
 *
 * @see createOrvalQueryClient for the React Query instance (401-only interceptor).
 */
export function createOrvalAxiosClient(
  options?: BlueprintAxiosOptions,
): OrvalAxiosClient {
  const instance = Axios.create()

  // Match the same CSRF config as all other instances.
  instance.defaults.xsrfCookieName =
    options?.csrfCookieName ?? DEFAULT_CSRF_COOKIE_NAME
  instance.defaults.xsrfHeaderName =
    options?.csrfHeaderName ?? DEFAULT_CSRF_HEADER_NAME

  // Full error interceptor — 401 redirect + notification for everything else.
  instance.interceptors.response.use(undefined, (error: unknown) => {
    if (Axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        if (!error.config?.__suppressAuthRedirect) {
          handleUnauthorized(error, options)
        }
      } else if (!error.config?.__suppressToast) {
        showErrorNotification(error)
      }
    }
    return Promise.reject(error)
  })

  const mutator = <T>(
    config: AxiosRequestConfig,
    requestOptions?: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> => instance({ ...config, ...requestOptions })

  return { instance, mutator }
}
