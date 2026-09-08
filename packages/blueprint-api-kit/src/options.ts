/** Shared configuration for the axios instances this package builds. */
export interface BlueprintAxiosOptions {
  /**
   * Where to send the browser when a request comes back 401. Defaults to `/auth/login`.
   * Pass `onUnauthorized` instead to take over the behaviour entirely.
   */
  loginPath?: string
  /**
   * Called instead of the default redirect when a 401 is not handled inline. Use this to
   * route through the app's router rather than a full page load.
   */
  onUnauthorized?: (error: unknown) => void
  /**
   * Cookie holding the CSRF token. Defaults to `XSRF-TOKEN`, which is also the axios default.
   */
  csrfCookieName?: string
  /**
   * Header the CSRF token is sent in. Defaults to `X-CSRF-TOKEN` — note this differs from
   * the axios default of `X-XSRF-TOKEN`, to match what the backend expects.
   */
  csrfHeaderName?: string
}

export const DEFAULT_LOGIN_PATH = '/auth/login'
export const DEFAULT_CSRF_COOKIE_NAME = 'XSRF-TOKEN'
export const DEFAULT_CSRF_HEADER_NAME = 'X-CSRF-TOKEN'

/** Applies the configured 401 policy: caller-supplied handler, else a redirect. */
export function handleUnauthorized(
  error: unknown,
  options: BlueprintAxiosOptions | undefined,
): void {
  if (options?.onUnauthorized) {
    options.onUnauthorized(error)
    return
  }
  if (typeof window !== 'undefined') {
    window.location.href = options?.loginPath ?? DEFAULT_LOGIN_PATH
  }
}
