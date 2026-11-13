import type { ReactNode } from 'react'
import { RealtimeContext, RealtimeStatusContext } from './RealtimeProvider'
import type {
    RealtimeEventPayload,
    RealtimeHandler,
    RealtimeStatus,
} from './payload'

/**
 * A stand-in for the real-time connection in component tests. Components subscribe to it through
 * `useRealtimeEvent` exactly as they would under `RealtimeProvider`, and the test delivers events by
 * hand. No socket, no ticket and no `@microsoft/signalr`.
 */
export interface RealtimeTestChannel {
    /**
     * Delivers an event to the subscribers of its name and waits for their handlers, async ones
     * included. A handler that throws or rejects fails the returned promise, so the test sees it.
     */
    emit: (payload: RealtimeEventPayload) => Promise<void>
    /** Calls every subscriber without a payload, as a connection start or a reconnect does. */
    resync: () => Promise<void>
    /** Whether a mounted component currently subscribes to the event. */
    isSubscribed: (eventName: string) => boolean
}

interface ChannelContextValue {
    subscribe: (eventName: string, handler: RealtimeHandler) => () => void
}

// Kept off the public type, so a test talks to the channel only the way the connection would.
const contextValues = new WeakMap<RealtimeTestChannel, ChannelContextValue>()

/** Creates a channel to pass to `RealtimeTestProvider`. One per test. */
export const createRealtimeTestChannel = (): RealtimeTestChannel => {
    const subscribers = new Map<string, Set<RealtimeHandler>>()

    const run = async (
        handlers: Iterable<RealtimeHandler>,
        payload?: RealtimeEventPayload,
    ) => {
        await Promise.all(
            [...handlers].map(async (handler) => handler(payload)),
        )
    }

    const channel: RealtimeTestChannel = {
        emit: (payload) =>
            run(subscribers.get(payload.eventName) ?? [], payload),
        resync: () =>
            run([...subscribers.values()].flatMap((handlers) => [...handlers])),
        isSubscribed: (eventName) =>
            (subscribers.get(eventName)?.size ?? 0) > 0,
    }

    contextValues.set(channel, {
        subscribe: (eventName, handler) => {
            // A wrapper per registration, as in the real provider: two subscriptions of one function stay
            // independent.
            const registration: RealtimeHandler = (payload) => handler(payload)
            let handlers = subscribers.get(eventName)
            if (!handlers) {
                handlers = new Set()
                subscribers.set(eventName, handlers)
            }
            handlers.add(registration)
            return () => {
                subscribers.get(eventName)?.delete(registration)
            }
        },
    })

    return channel
}

/**
 * Provides `channel` to the components below it in place of `RealtimeProvider`. `status` is what
 * `useRealtimeStatus` returns, `connected` unless the test says otherwise.
 */
export const RealtimeTestProvider = ({
    channel,
    status = 'connected',
    children,
}: {
    channel: RealtimeTestChannel
    status?: RealtimeStatus
    children: ReactNode
}) => {
    const value = contextValues.get(channel)
    if (!value) {
        throw new Error('Create the channel with createRealtimeTestChannel()')
    }

    return (
        <RealtimeContext value={value}>
            <RealtimeStatusContext value={status}>
                {children}
            </RealtimeStatusContext>
        </RealtimeContext>
    )
}
