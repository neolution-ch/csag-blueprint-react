import { useContext } from 'react'
import type { RealtimeStatus } from './payload'
import { RealtimeStatusContext } from './RealtimeProvider'

/**
 * Reports where the real-time connection currently stands.
 *
 * Intended for surfaces that genuinely need to explain themselves — a diagnostics page, or a view
 * whose freshness claim would otherwise be misleading while the socket is down. Ordinary screens do
 * not need it: they invalidate on the events they subscribe to and refetch on window focus anyway,
 * so a connection indicator would be noise.
 */
export function useRealtimeStatus(): RealtimeStatus {
  return useContext(RealtimeStatusContext)
}
