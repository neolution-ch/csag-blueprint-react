import { z } from 'zod'

/**
 * The only message shape carried over the real-time channel, as the backend's `RealtimeEvent`
 * serializes it.
 *
 * It is a signal, not data: handlers react by invalidating a query and refetching through the
 * ordinary API, so authorization is re-applied on every update and a dropped message costs a delay
 * rather than a stale screen.
 */
export const realtimeEventPayloadSchema = z.object({
  eventName: z.string().min(1),
  entityId: z.string().min(1),
  occurredAt: z.string().min(1),
})

export type RealtimeEventPayload = z.infer<typeof realtimeEventPayloadSchema>

/**
 * Called when a subscribed event arrives, and again with no argument whenever the connection starts
 * or reconnects: messages sent before the socket was live are not replayed, so subscribers resync at
 * that point. A handler may be async. A rejection is reported and never reaches the other
 * subscribers.
 */
export type RealtimeHandler = (
  payload?: RealtimeEventPayload,
) => void | Promise<void>

/**
 * What the API answers when the browser asks for a ticket. `enabled` is false when the environment
 * runs without a real-time provider.
 */
export interface RealtimeTicket {
  enabled: boolean
  url?: string | null
  accessToken?: string | null
  expiresAt?: string | null
}

/**
 * Where the connection currently stands.
 *
 * `disabled` is not a failure: it is the state of every environment that configures no provider,
 * and of a session that has no tenant to be connected on behalf of. A surface reporting it should
 * say so plainly rather than render an error.
 */
export type RealtimeStatus =
  'disabled' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

/** Receives the failures the channel swallows so the rest of the app keeps working. */
export type RealtimeErrorReporter = (message: string, error?: unknown) => void
