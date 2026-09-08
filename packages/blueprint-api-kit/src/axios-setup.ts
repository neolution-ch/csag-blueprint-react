import axios from 'axios'
import { showErrorNotification } from '#/integrations/tanstack-query/showErrorNotification'

// Configure Axios to send the CSRF token on state-changing requests.
// Axios reads the cookie specified by xsrfCookieName and sends its value
// as the header specified by xsrfHeaderName on POST/PUT/PATCH/DELETE requests.
// The cookie name matches the default but the header name differs from Axios's
// default (X-XSRF-TOKEN) to match the backend's expected header (X-CSRF-TOKEN).
axios.defaults.xsrfCookieName = 'XSRF-TOKEN'
axios.defaults.xsrfHeaderName = 'X-CSRF-TOKEN'

// Global response interceptor for direct axios calls (not Orval-generated code).
//
// Orval-generated code uses a separate axios instance (orvalAxiosInstance) that
// only handles 401s — React Query's onError handles the rest.
//
// This interceptor catches errors from any direct `axios.get(...)` etc. calls
// that bypass React Query entirely.
axios.interceptors.response.use(undefined, (error: unknown) => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login'
      }
    } else if (!error.config?.__suppressToast) {
      // Show error notification for all non-401 errors on direct axios calls.
      // These bypass React Query so there's no onError to catch them.
      // Callers can pass { __suppressToast: true } to handle errors themselves.
      showErrorNotification(error)
    }
  }
  return Promise.reject(error)
})
