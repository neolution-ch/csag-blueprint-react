import axios from 'axios'
import { showErrorNotification } from './show-error-notification'
import {
  DEFAULT_CSRF_COOKIE_NAME,
  DEFAULT_CSRF_HEADER_NAME,
  handleUnauthorized,
} from './options'
import type { BlueprintAxiosOptions } from './options'

/**
 * Configures the global axios default instance: CSRF headers plus a response interceptor.
 *
 * This mutates the axios module singleton, which is why axios is a peer dependency — a
 * second copy in the dependency tree would be configured here and never used by the app.
 *
 * Call once during app start-up.
 */
export function configureGlobalAxios(options?: BlueprintAxiosOptions): void {
  // Configure Axios to send the CSRF token on state-changing requests.
  // Axios reads the cookie specified by xsrfCookieName and sends its value
  // as the header specified by xsrfHeaderName on POST/PUT/PATCH/DELETE requests.
  // The cookie name matches the default but the header name differs from Axios's
  // default (X-XSRF-TOKEN) to match the backend's expected header (X-CSRF-TOKEN).
  axios.defaults.xsrfCookieName =
    options?.csrfCookieName ?? DEFAULT_CSRF_COOKIE_NAME
  axios.defaults.xsrfHeaderName =
    options?.csrfHeaderName ?? DEFAULT_CSRF_HEADER_NAME

  // Global response interceptor for direct axios calls (not Orval-generated code).
  //
  // Orval-generated code uses separate axios instances that only handle 401s — React
  // Query's onError handles the rest.
  //
  // This interceptor catches errors from any direct `axios.get(...)` etc. calls
  // that bypass React Query entirely.
  axios.interceptors.response.use(undefined, (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        handleUnauthorized(error, options)
      } else if (!error.config?.__suppressToast) {
        // Show error notification for all non-401 errors on direct axios calls.
        // These bypass React Query so there's no onError to catch them.
        // Callers can pass { __suppressToast: true } to handle errors themselves.
        showErrorNotification(error)
      }
    }
    return Promise.reject(error)
  })
}
