import 'axios'

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    /**
     * Suppress the toast notification for this request's errors.
     *
     * **Only applies to direct axios calls** — the global instance configured by
     * `configureGlobalAxios`, and the one built by `createOrvalAxiosClient`.
     * For React Query hooks, use `meta: { suppressToast: true }` on the
     * `useQuery` / `useMutation` call instead — the QueryCache/MutationCache
     * `onError` handlers in `createBlueprintQueryClient` read that flag.
     *
     * Direct axios usage:
     * ```ts
     * axios.post('/api/example', data, { __suppressToast: true })
     * ```
     *
     * React Query usage (equivalent):
     * ```ts
     * useExampleMutation({ mutation: { meta: { suppressToast: true } } })
     * ```
     */
    __suppressToast?: boolean

    /**
     * Suppress the automatic `window.location.href = '/auth/login'` redirect
     * on 401 responses for this request.
     *
     * Used by a bootstrap current-user check, where a 401 simply means "not logged
     * in" and must be handled by the caller instead of bouncing public routes to
     * the login page.
     */
    __suppressAuthRedirect?: boolean
  }

  interface AxiosRequestConfig {
    __suppressToast?: boolean
    __suppressAuthRedirect?: boolean
  }
}

declare module '@tanstack/react-query' {
  // Typed meta keys understood by QueryCache.onError / MutationCache.onError.
  interface Register {
    queryMeta: {
      /** Suppress the toast notification for this query's errors. */
      suppressToast?: boolean
    }
    mutationMeta: {
      /** Suppress the toast notification for this mutation's errors. */
      suppressToast?: boolean
    }
  }
}

// Ambient augmentations only; the empty export keeps this a module.
export {}
