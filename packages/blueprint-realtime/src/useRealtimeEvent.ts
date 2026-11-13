import { useContext, useEffect, useRef } from 'react'
import type { RealtimeHandler } from './payload'
import { RealtimeContext } from './RealtimeProvider'

/**
 * Runs `handler` whenever the named real-time event arrives, and again with no argument whenever the
 * connection starts or reconnects, so the subscriber can resync what it missed.
 *
 * The framework knows nothing about event names — they belong to whichever feature publishes them,
 * which is what lets a feature be deleted without touching anything here.
 *
 * Handlers should invalidate a query rather than write pushed values into the cache: the refetch
 * re-applies the server's filters and permissions, and a table view's paging and sorting cannot be
 * reproduced correctly on the client.
 */
export function useRealtimeEvent(eventName: string, handler: RealtimeHandler) {
  const context = useContext(RealtimeContext)

  // The handler is held in a ref and kept out of the effect's dependencies, so callers can pass
  // an inline arrow — the natural way to write one — without re-subscribing on every render.
  // Subscribing is not free: it mutates a shared map, and a handler that churned every render
  // would also drop any event arriving between the teardown and the next subscribe.
  const handlerRef = useRef(handler)

  useEffect(() => {
    handlerRef.current = handler
  })

  useEffect(() => {
    if (!context) return
    return context.subscribe(eventName, (payload) =>
      handlerRef.current(payload),
    )
  }, [context, eventName])
}
