import type * as SignalR from '@microsoft/signalr'
import type { ReactNode } from 'react'
import { createContext, useEffect, useMemo, useRef, useState } from 'react'
import { realtimeEventPayloadSchema } from './payload'
import type {
    RealtimeErrorReporter,
    RealtimeEventPayload,
    RealtimeHandler,
    RealtimeStatus,
    RealtimeTicket,
} from './payload'

interface RealtimeContextValue {
    subscribe: (eventName: string, handler: RealtimeHandler) => () => void
}

export const RealtimeContext = createContext<RealtimeContextValue | undefined>(
    undefined,
)

/**
 * Deliberately a second context rather than another member of the value above.
 *
 * `useRealtimeEvent` keeps its context in an effect dependency, so a context value whose identity
 * changed on every status transition would drop and re-establish every subscription in the app each
 * time the socket wobbled. Keeping the two apart lets the subscribe value stay referentially stable
 * for the lifetime of the provider.
 */
export const RealtimeStatusContext = createContext<RealtimeStatus>('connecting')

const RECONNECT_DELAYS_MS = [0, 2000, 10_000, 30_000]
const MAX_INITIAL_RETRY_DELAY_MS = 30_000

const reportToConsole: RealtimeErrorReporter = (message, error) => {
    console.warn(message, error)
}

export interface RealtimeProviderProps {
    /**
     * The active tenant. The connection is keyed on it: a change tears the connection down and asks
     * for a new ticket, because group membership is granted per tenant when the ticket is issued.
     * Without a tenant the channel is `disabled`.
     */
    tenantId: string | null | undefined
    /**
     * Asks the API for a ticket. Called for the first connection and again for every retry and
     * reconnect, since the ticket is what renews the group membership. Pass the signal on to the
     * request, so a tenant switch cancels a request still in flight. Real-time is an enhancement, so
     * the request should not raise the app's global error notification.
     */
    fetchTicket: (signal: AbortSignal) => Promise<RealtimeTicket>
    /** Receives the failures the channel swallows. Defaults to `console.warn`. */
    onError?: RealtimeErrorReporter
    children: ReactNode
}

/**
 * Holds one real-time connection for the session and fans incoming events out to subscribers.
 *
 * The transport is Azure SignalR Service in serverless mode: the API issues a ticket, and the
 * browser connects to the service directly. `@microsoft/signalr` is imported only once a ticket says
 * real-time is on, so it stays out of the bundle a disabled environment loads.
 */
export const RealtimeProvider = ({
    tenantId,
    fetchTicket,
    onError = reportToConsole,
    children,
}: RealtimeProviderProps) => {
    const subscribers = useRef(new Map<string, Set<RealtimeHandler>>())
    const [status, setStatus] = useState<RealtimeStatus>('connecting')

    // Held in refs and kept out of the effect's dependencies, so inline functions passed by the host
    // do not reconnect on every render.
    const fetchTicketRef = useRef(fetchTicket)
    const onErrorRef = useRef(onError)
    useEffect(() => {
        fetchTicketRef.current = fetchTicket
        onErrorRef.current = onError
    })

    const value = useMemo<RealtimeContextValue>(
        () => ({
            subscribe: (eventName, handler) => {
                // Registered as a wrapper rather than the handler itself: a Set keyed on identity would
                // collapse two consumers that subscribe the same function into one entry, and the first of
                // them to unmount would take the other's subscription with it.
                const registration: RealtimeHandler = (payload) =>
                    handler(payload)

                let handlers = subscribers.current.get(eventName)
                if (!handlers) {
                    handlers = new Set()
                    subscribers.current.set(eventName, handlers)
                }
                handlers.add(registration)
                return () => {
                    // The set is looked up again rather than captured: an event name is dropped together
                    // with its last handler, so a later subscription to the same name installs a different
                    // set.
                    const current = subscribers.current.get(eventName)
                    if (!current) return
                    current.delete(registration)
                    // Event names come from features rather than a fixed list, so empty sets left behind
                    // would grow the map for as long as the session lasts.
                    if (current.size === 0) {
                        subscribers.current.delete(eventName)
                    }
                }
            },
        }),
        [],
    )

    useEffect(() => {
        // Membership is granted per tenant at ticket time, so without a tenant there is nothing to
        // connect on behalf of, and saying so beats leaving the status on "connecting".
        if (!tenantId) {
            // The status tracks the connection this effect owns, so starting or skipping one is where it
            // changes.
            setStatus('disabled')
            return
        }

        setStatus('connecting')

        // An AbortController rather than a boolean: it cancels the retry backoff and a ticket request in
        // flight immediately on unmount instead of leaving them to run out.
        const abort = new AbortController()
        // Read through a call rather than touching the property directly: TypeScript narrows a property
        // read and then treats every later check in the same flow as a constant.
        const isAborted = () => abort.signal.aborted
        const report: RealtimeErrorReporter = (message, error) => {
            onErrorRef.current(message, error)
        }
        let connection: SignalR.HubConnection | undefined

        // Subscribers are independent of each other: one that throws or rejects must not stop the rest
        // from being told, or a single broken screen would freeze every other screen's data.
        const run = async (
            handler: RealtimeHandler,
            payload?: RealtimeEventPayload,
        ) => {
            try {
                await handler(payload)
            } catch (error) {
                report(
                    'A realtime subscriber failed while handling a signal',
                    error,
                )
            }
        }
        const notify = (
            handlers: Set<RealtimeHandler>,
            payload?: RealtimeEventPayload,
        ) => {
            for (const handler of handlers) {
                void run(handler, payload)
            }
        }

        // Handlers called with no argument mean "you may have missed something": nothing published while
        // the socket was down is replayed, so every subscriber refetches for itself.
        const resync = () => {
            for (const handlers of subscribers.current.values()) {
                notify(handlers)
            }
        }

        const requestTicket = () => fetchTicketRef.current(abort.signal)

        // Waits 1, 2, 4 ... up to 30 seconds before the next attempt, and returns at once on teardown.
        const waitBeforeRetry = (attempt: number) =>
            new Promise<void>((resolve) => {
                // The abort listener is scoped to this one wait. The retry loops are unbounded, so without
                // removal every attempt would leave another closure attached to a signal that lives until
                // unmount.
                const waitScope = new AbortController()
                const timer = setTimeout(
                    () => {
                        waitScope.abort()
                        resolve()
                    },
                    Math.min(MAX_INITIAL_RETRY_DELAY_MS, 1000 * 2 ** attempt),
                )
                abort.signal.addEventListener(
                    'abort',
                    () => {
                        clearTimeout(timer)
                        resolve()
                    },
                    { once: true, signal: waitScope.signal },
                )
            })

        const connect = async () => {
            // The first ticket gets the same backoff as the first connect: the API can be cold-starting or
            // briefly unavailable, and nothing else asks again until the tenant changes.
            let ticket: RealtimeTicket | undefined
            for (let attempt = 0; ticket === undefined; attempt += 1) {
                try {
                    ticket = await requestTicket()
                } catch (error) {
                    // Aborting cancels the request in flight, so a rejection here is the teardown doing its
                    // job rather than a ticket the API refused to issue.
                    if (isAborted()) return
                    report(
                        `Could not obtain a realtime ticket (attempt ${String(attempt + 1)}), retrying`,
                        error,
                    )
                    await waitBeforeRetry(attempt)
                    if (isAborted()) return
                }
            }

            // The status is shared across tenants, so an answer that arrives after a switch must not
            // describe the connection the new tenant is already building.
            if (isAborted()) return

            // Real-time is switched off for this environment. Nothing to connect to, and the client library
            // is never imported.
            if (!ticket.enabled || !ticket.url) {
                setStatus('disabled')
                return
            }

            let signalR: typeof SignalR
            try {
                signalR = await import('@microsoft/signalr')
            } catch (error) {
                // The client library is a chunk of its own, so fetching it can fail on its own: a deployment
                // that replaced the asset, or a network that dropped mid-load.
                if (isAborted()) return
                report('Could not load the realtime client', error)
                setStatus('disconnected')
                return
            }

            if (isAborted()) return

            // The ticket that decided this connection carries a token of its own, and issuing it already
            // granted the tenant group membership. Spending it on the first attempt saves a second
            // negotiation. Every later call is a retry or a reconnect, which needs a fresh ticket because
            // that is what re-applies the membership.
            let unusedToken: string | undefined = ticket.accessToken ?? ''

            connection = new signalR.HubConnectionBuilder()
                .withUrl(ticket.url, {
                    accessTokenFactory: async () => {
                        if (unusedToken !== undefined) {
                            const token = unusedToken
                            unusedToken = undefined
                            return token
                        }
                        return (await requestTicket()).accessToken ?? ''
                    },
                    // The connection goes straight to the real-time service, never to the app's own API, so
                    // no session cookie should ride along with it.
                    withCredentials: false,
                })
                .withAutomaticReconnect([...RECONNECT_DELAYS_MS])
                .build()

            connection.on('Notify', (message: unknown) => {
                // stop() is asynchronous, so a signal queued for the old tenant can still arrive after the
                // switch. The subscribers are the new tenant's by then, and an entity id from the old one
                // would send them refetching for something they cannot see.
                if (isAborted()) return

                // The wire is outside the type system: check the envelope before any subscriber trusts it.
                const parsed = realtimeEventPayloadSchema.safeParse(message)
                if (!parsed.success) {
                    report(
                        'Ignored a realtime message that is not a valid envelope',
                        parsed.error,
                    )
                    return
                }

                const handlers = subscribers.current.get(parsed.data.eventName)
                if (handlers) notify(handlers, parsed.data)
            })

            connection.onreconnecting(() => {
                if (!isAborted()) setStatus('reconnecting')
            })
            connection.onclose(() => {
                if (!isAborted()) setStatus('disconnected')
            })
            connection.onreconnected(() => {
                // A connection that is being torn down can still reconnect once before it stops, and its
                // subscribers now belong to the next tenant.
                if (isAborted()) return
                setStatus('connected')
                resync()
            })

            // withAutomaticReconnect does not cover the first connect, and the API can be cold-starting,
            // so the initial attempt needs its own backoff.
            for (let attempt = 0; !isAborted(); attempt += 1) {
                try {
                    await connection.start()
                    if (!isAborted()) setStatus('connected')
                    // Every start covers a gap, because nothing published before the socket was live is
                    // replayed. The cost is one refetch per subscribed query when the channel comes up.
                    if (!isAborted()) resync()
                    return
                } catch (error) {
                    if (isAborted()) return
                    report(
                        `Realtime connection failed (attempt ${String(attempt + 1)}), retrying`,
                        error,
                    )
                    await waitBeforeRetry(attempt)
                }
            }
        }

        void connect()

        return () => {
            abort.abort()
            void connection?.stop()
        }
    }, [tenantId])

    return (
        <RealtimeContext value={value}>
            <RealtimeStatusContext value={status}>
                {children}
            </RealtimeStatusContext>
        </RealtimeContext>
    )
}
