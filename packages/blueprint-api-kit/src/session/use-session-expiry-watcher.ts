import { useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useRouterState } from '@tanstack/react-router'

const SESSION_STATUS_QUERY_KEY = ['auth', 'session-status'] as const

// Focus refetches only fire once the cached status is this old, so tab-switching
// within a minute stays quiet while a long idle period still triggers a check.
const FOCUS_STALE_TIME = 60_000

export type SessionStatus = 'authenticated' | 'expired' | 'error'

export interface SessionExpiryWatcherOptions {
  /**
   * Pings the server and reports whether the session is still valid. Injected because the
   * request itself is generated from the consuming app's OpenAPI spec.
   *
   * Must distinguish `'expired'` from `'error'`: a transient network failure has to
   * resolve to `'error'` so a blip never logs anyone out.
   */
  checkSession: () => Promise<SessionStatus>
  /** Where to send an expired session. Defaults to `/auth/login`. */
  loginPath?: string
}

/**
 * Proactively detects a server-side session expiry while the user sits on a page
 * without navigating (the classic "left the tab open overnight" case). When the
 * tab regains focus after being idle, it pings the session endpoint and, on a
 * *confirmed* expiry, clears cached data and sends the user to login with the current
 * location preserved as `redirectUrl`.
 *
 * Why this exists in addition to the route guards: the current-user query typically lives
 * in the router's beforeLoad context, cached with staleTime Infinity, so it is not
 * revalidated on navigation and no mounted `useQuery` observes it. This hook is the
 * proactive expiry signal; the global 401 interceptor is the reactive backstop.
 *
 * Deliberately NO polling heartbeat: a session cookie with sliding expiration and no
 * absolute cap would have a periodic authenticated ping keep renewing an
 * abandoned-but-focused session, defeating the idle timeout — the very thing this hook is
 * meant to surface. Window focus is the right trigger: it fires when the user actually
 * returns to the tab.
 *
 * Mount only inside the authenticated shell.
 */
export function useSessionExpiryWatcher({
  checkSession,
  loginPath = '/auth/login',
}: SessionExpiryWatcherOptions) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const href = useRouterState({ select: (s) => s.location.href })
  const redirectedRef = useRef(false)

  const { data: status } = useQuery({
    queryKey: SESSION_STATUS_QUERY_KEY,
    queryFn: checkSession,
    // The shell only mounts for an already-authenticated user (bootstrap just
    // fetched the current user), so seed the status and skip the mount refetch —
    // the first real check comes from a focus event.
    initialData: 'authenticated' as const,
    refetchOnMount: false,
    staleTime: FOCUS_STALE_TIME,
    refetchOnWindowFocus: true,
  })

  useEffect(() => {
    if (status !== 'expired' || redirectedRef.current) {
      return
    }
    // One-shot: clearing the cache re-runs this query, so guard against a
    // redirect loop while the navigation unmounts the shell.
    redirectedRef.current = true
    queryClient.clear()
    void navigate({
      to: loginPath,
      search: { redirectUrl: href },
    })
  }, [status, href, navigate, queryClient, loginPath])
}
