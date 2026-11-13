// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { useContext, useEffect } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { RealtimeHandler, RealtimeTicket } from '../payload'
import { RealtimeContext, RealtimeProvider } from '../RealtimeProvider'
import { useRealtimeEvent } from '../useRealtimeEvent'
import { useRealtimeStatus } from '../useRealtimeStatus'

interface ConnectionOptions {
    accessTokenFactory: () => Promise<string>
}

// Hoisted with the vi.mock factories below, which run before the module body.
const { connection, realtimeTicket, start, warn } = vi.hoisted(() => ({
    connection: {
        options: undefined as ConnectionOptions | undefined,
        // The lifecycle callbacks the provider registers, so a test can play a reconnect or a drop
        // without a real socket.
        notify: undefined as ((payload: unknown) => void) | undefined,
        closed: undefined as (() => void) | undefined,
        reconnected: undefined as (() => void) | undefined,
        reconnecting: undefined as (() => void) | undefined,
        notifyRegistrations: 0,
    },
    realtimeTicket:
        vi.fn<
            (options: {
                signal: AbortSignal
            }) => Promise<{ data: RealtimeTicket }>
        >(),
    start: vi.fn(),
    warn: vi.fn(),
}))

// The host's ticket request, shaped like an Orval client call that answers { data }.
const fetchTicket = async (signal: AbortSignal) =>
    (await realtimeTicket({ signal })).data

vi.mock('@microsoft/signalr', () => {
    class HubConnectionBuilder {
        withUrl(_url: string, options: ConnectionOptions) {
            connection.options = options
            return this
        }

        withAutomaticReconnect() {
            return this
        }

        build() {
            return {
                on: (
                    _eventName: string,
                    handler: (payload: unknown) => void,
                ) => {
                    connection.notify = handler
                    connection.notifyRegistrations += 1
                },
                onclose: (handler: () => void) => {
                    connection.closed = handler
                },
                onreconnected: (handler: () => void) => {
                    connection.reconnected = handler
                },
                onreconnecting: (handler: () => void) => {
                    connection.reconnecting = handler
                },
                start,
                stop: vi.fn(),
            }
        }
    }

    return { HubConnectionBuilder }
})

const enabledTicket = {
    accessToken: 'first-token',
    enabled: true,
    expiresAt: new Date().toISOString(),
    url: 'https://realtime.example/client/?hub=app',
}

beforeEach(() => {
    connection.options = undefined
    connection.notify = undefined
    connection.closed = undefined
    connection.reconnected = undefined
    connection.reconnecting = undefined
    connection.notifyRegistrations = 0
    realtimeTicket.mockReset()
    warn.mockReset()
    start.mockReset()
    start.mockResolvedValue(undefined)
})

afterEach(() => {
    // This suite runs without the globals that auto-clean, so a rendered tree would otherwise stay
    // in the document and be found by the next test's queries.
    cleanup()
    vi.restoreAllMocks()
})

it('connects with the token of the ticket it already issued', async () => {
    realtimeTicket
        .mockResolvedValueOnce({ data: enabledTicket })
        .mockResolvedValue({
            data: { ...enabledTicket, accessToken: 'refreshed-token' },
        })

    render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            {null}
        </RealtimeProvider>,
    )

    await waitFor(() => expect(start).toHaveBeenCalled())

    // Issuing the ticket is what granted the tenant group membership, so spending its token on the
    // first attempt is what keeps a single connect to a single negotiation.
    expect(realtimeTicket).toHaveBeenCalledTimes(1)
    await expect(connection.options?.accessTokenFactory()).resolves.toBe(
        'first-token',
    )
    expect(realtimeTicket).toHaveBeenCalledTimes(1)

    // Every later call is a retry or a reconnect, which needs a new ticket because that is what
    // re-applies the membership.
    await expect(connection.options?.accessTokenFactory()).resolves.toBe(
        'refreshed-token',
    )
    expect(realtimeTicket).toHaveBeenCalledTimes(2)
})

it('resyncs subscribers when the first connection only succeeds on a retry', async () => {
    realtimeTicket.mockResolvedValue({ data: enabledTicket })
    start
        .mockRejectedValueOnce(new Error('negotiate failed'))
        .mockResolvedValue(undefined)

    const handler = vi.fn()

    const Subscriber = () => {
        useRealtimeEvent('pedalos.changed', handler)
        return null
    }

    render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            <Subscriber />
        </RealtimeProvider>,
    )

    // The second attempt is behind the 1s backoff of the first failure.
    await waitFor(() => expect(start).toHaveBeenCalledTimes(2), {
        timeout: 5000,
    })

    // Signals published while the backoff ran are not replayed, so a connection that arrives late
    // has to tell subscribers to refetch — the same contract as onreconnected. The handler is
    // called without a payload, which is what "you may have missed something" means here.
    await waitFor(() => expect(handler).toHaveBeenCalled())
    expect(handler.mock.calls[0]?.[0]).toBeUndefined()
})

it('resyncs subscribers once the first connection attempt succeeds', async () => {
    realtimeTicket.mockResolvedValue({ data: enabledTicket })

    const handler: RealtimeHandler = vi.fn()

    const Subscriber = () => {
        useRealtimeEvent('pedalos.changed', handler)
        return null
    }

    render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            <Subscriber />
        </RealtimeProvider>,
    )

    await waitFor(() => expect(start).toHaveBeenCalledTimes(1))

    // The subscriber fetched as it mounted, while the ticket and the negotiation were still in
    // flight, so whatever was published in between is only picked up by a refetch.
    await waitFor(() => expect(handler).toHaveBeenCalledTimes(1))
    expect(handler).toHaveBeenCalledWith(undefined)
})

it('resyncs subscribers when a connection replaces another tenant', async () => {
    realtimeTicket.mockResolvedValue({ data: enabledTicket })

    const handler = vi.fn()

    const Subscriber = () => {
        useRealtimeEvent('pedalos.changed', handler)
        return null
    }

    const { rerender } = render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            <Subscriber />
        </RealtimeProvider>,
    )

    await waitFor(() => expect(start).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(handler).toHaveBeenCalledTimes(1))
    handler.mockClear()

    rerender(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-b"
        >
            <Subscriber />
        </RealtimeProvider>,
    )

    await waitFor(() => expect(start).toHaveBeenCalledTimes(2))

    // The subscriber never unmounted, so nothing refetched on its own while the connection was
    // being rebuilt for the new tenant — the connection has to say so.
    await waitFor(() => expect(handler).toHaveBeenCalled())
    expect(handler.mock.calls[0]?.[0]).toBeUndefined()
})

it('resyncs when the tenant changes before the first connection succeeds', async () => {
    realtimeTicket.mockResolvedValue({ data: enabledTicket })
    // The first tenant never connects: its attempt is still pending when the switch happens.
    start.mockImplementationOnce(
        () =>
            new Promise(() => {
                // Never settles.
            }),
    )

    const handler = vi.fn()

    const Subscriber = () => {
        useRealtimeEvent('pedalos.changed', handler)
        return null
    }

    const { rerender } = render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            <Subscriber />
        </RealtimeProvider>,
    )

    await waitFor(() => expect(start).toHaveBeenCalledTimes(1))

    rerender(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-b"
        >
            <Subscriber />
        </RealtimeProvider>,
    )

    await waitFor(() => expect(start).toHaveBeenCalledTimes(2))

    // The subscribers stayed mounted across the switch, so the gap is theirs whether or not the
    // abandoned tenant ever got as far as connecting.
    await waitFor(() => expect(handler).toHaveBeenCalled())
})

it('delivers a signal to the subscribers of its event only', async () => {
    realtimeTicket.mockResolvedValue({ data: enabledTicket })

    const pedalos = vi.fn()
    const customers = vi.fn()

    const Subscribers = () => {
        useRealtimeEvent('pedalos.changed', pedalos)
        useRealtimeEvent('customers.changed', customers)
        return null
    }

    render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            <Subscribers />
        </RealtimeProvider>,
    )

    // The start-up resync reaches every subscriber; what follows is about the signal alone.
    await waitFor(() => expect(pedalos).toHaveBeenCalledTimes(1))
    pedalos.mockClear()
    customers.mockClear()

    const payload = {
        entityId: '11111111-1111-1111-1111-111111111111',
        eventName: 'pedalos.changed',
        occurredAt: new Date().toISOString(),
    }
    connection.notify?.(payload)

    expect(pedalos).toHaveBeenCalledTimes(1)
    expect(pedalos).toHaveBeenCalledWith(payload)
    expect(customers).not.toHaveBeenCalled()
})

it('ignores a signal the replaced connection delivers after a tenant switch', async () => {
    realtimeTicket.mockResolvedValue({ data: enabledTicket })

    const handler = vi.fn()

    const Subscriber = () => {
        useRealtimeEvent('pedalos.changed', handler)
        return null
    }

    const { rerender } = render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            <Subscriber />
        </RealtimeProvider>,
    )

    await waitFor(() => expect(handler).toHaveBeenCalledTimes(1))
    const notifyTenantA = connection.notify
    expect(notifyTenantA).toBeDefined()

    rerender(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-b"
        >
            <Subscriber />
        </RealtimeProvider>,
    )

    await waitFor(() => expect(handler).toHaveBeenCalledTimes(2))
    expect(connection.notify).not.toBe(notifyTenantA)
    handler.mockClear()

    // stop() is asynchronous, so the old connection can still hand over a signal queued for
    // tenant A. The subscriber belongs to tenant B by now and must not refetch for it.
    notifyTenantA?.({
        entityId: '11111111-1111-1111-1111-111111111111',
        eventName: 'pedalos.changed',
        occurredAt: new Date().toISOString(),
    })

    expect(handler).not.toHaveBeenCalled()
})

it('keeps notifying the other subscribers when one of them throws', async () => {
    realtimeTicket.mockResolvedValue({ data: enabledTicket })
    start
        .mockRejectedValueOnce(new Error('negotiate failed'))
        .mockResolvedValue(undefined)

    const throwing = vi.fn(() => {
        throw new Error('a screen blew up')
    })
    const healthy = vi.fn()

    const Subscribers = () => {
        useRealtimeEvent('pedalos.changed', throwing)
        useRealtimeEvent('pedalos.changed', healthy)
        return null
    }

    render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            <Subscribers />
        </RealtimeProvider>,
    )

    await waitFor(() => expect(start).toHaveBeenCalledTimes(2), {
        timeout: 5000,
    })

    // The resync walks the subscribers in order, so the second one only hears about the gap if the
    // first one's failure was contained.
    await waitFor(() => expect(healthy).toHaveBeenCalled())
    expect(throwing).toHaveBeenCalled()
    expect(warn).toHaveBeenCalled()
})

it('cancels a ticket request that is still in flight when the tenant goes away', async () => {
    let ticketSignal: AbortSignal | undefined
    let ticketRequest: Promise<{ data: RealtimeTicket }> | undefined

    realtimeTicket.mockImplementation((options: { signal: AbortSignal }) => {
        ticketSignal = options.signal
        ticketRequest = new Promise<{ data: RealtimeTicket }>(
            (_resolve, reject) => {
                options.signal.addEventListener('abort', () =>
                    reject(new Error('canceled')),
                )
            },
        )

        return ticketRequest
    })

    const { unmount } = render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            {null}
        </RealtimeProvider>,
    )

    await waitFor(() => expect(ticketSignal).toBeDefined())
    unmount()

    expect(ticketSignal?.aborted).toBe(true)

    // The assertions below describe what the provider did with the rejection, so they have to wait
    // for it: first for the request to settle, then for the microtasks that carry it into the catch
    // in connect(). Asserting straight after unmount() would pass while that catch is still queued.
    await expect(ticketRequest).rejects.toThrow('canceled')
    await new Promise((resolve) => setTimeout(resolve, 0))

    // The rejection is the teardown working, so it must leave no warning behind and no connection
    // half-started.
    expect(start).not.toHaveBeenCalled()
    expect(warn).not.toHaveBeenCalled()
})

const StatusBadge = () => (
    <span data-testid="status">{useRealtimeStatus()}</span>
)

it('reports the channel as disabled for a user without a tenant', async () => {
    realtimeTicket.mockResolvedValue({ data: enabledTicket })

    const { getByTestId } = render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId={undefined}
        >
            <StatusBadge />
        </RealtimeProvider>,
    )

    // Nothing is connected on behalf of a tenantless user, and saying so beats leaving the badge on
    // "connecting" for a connection that is never attempted.
    await waitFor(() =>
        expect(getByTestId('status').textContent).toBe('disabled'),
    )
    expect(start).not.toHaveBeenCalled()
})

it('reports the channel as disabled when the ticket says the feature is off', async () => {
    // What every fresh app returns: RealtimeSettings:Provider is None, so the API issues no ticket
    // and says so inside a 200 rather than failing.
    realtimeTicket.mockResolvedValue({ data: { enabled: false } })

    const { getByTestId } = render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            <StatusBadge />
        </RealtimeProvider>,
    )

    await waitFor(() =>
        expect(getByTestId('status').textContent).toBe('disabled'),
    )

    // The client library is never imported in this state, so nothing should have been started.
    expect(start).not.toHaveBeenCalled()
})

it('moves the status through a reconnect and a drop', async () => {
    realtimeTicket.mockResolvedValue({ data: enabledTicket })

    const { getByTestId } = render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            <StatusBadge />
        </RealtimeProvider>,
    )

    await waitFor(() =>
        expect(getByTestId('status').textContent).toBe('connected'),
    )

    // The badge is the page's only indication that the channel works, so each lifecycle callback
    // has to move it.
    act(() => connection.reconnecting?.())
    expect(getByTestId('status').textContent).toBe('reconnecting')

    act(() => connection.reconnected?.())
    expect(getByTestId('status').textContent).toBe('connected')

    act(() => connection.closed?.())
    expect(getByTestId('status').textContent).toBe('disconnected')
})

it('delivers an event to the latest inline handler without resubscribing', async () => {
    realtimeTicket.mockResolvedValue({ data: enabledTicket })

    const first = vi.fn()
    const second = vi.fn()

    const Subscriber = ({
        handler,
    }: {
        handler: (payload?: unknown) => void
    }) => {
        // Inline on purpose: the hook holds the handler in a ref so this identity churn must not
        // re-subscribe.
        useRealtimeEvent('pedalos.changed', (payload) => handler(payload))
        return null
    }

    const { rerender } = render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            <Subscriber handler={first} />
        </RealtimeProvider>,
    )

    // The start-up resync reaches the handler first; what follows is about the signal alone.
    await waitFor(() => expect(first).toHaveBeenCalledTimes(1))
    first.mockClear()

    rerender(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            <Subscriber handler={second} />
        </RealtimeProvider>,
    )

    act(() =>
        connection.notify?.({
            entityId: '11111111-1111-1111-1111-111111111111',
            eventName: 'pedalos.changed',
            occurredAt: new Date().toISOString(),
        }),
    )

    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()

    // One registration for the connection and one subscriber entry: a handler that churned every
    // render would leave duplicates behind and deliver the event twice.
    expect(connection.notifyRegistrations).toBe(1)
})

it('keeps two subscriptions of the same function independent', async () => {
    realtimeTicket.mockResolvedValue({ data: enabledTicket })

    const shared = vi.fn()

    // Subscribing through the context rather than the hook: the hook wraps every handler in a fresh
    // closure, so it is the raw contract that has to survive two consumers passing one function.
    const RawSubscriber = ({ mounted }: { mounted: boolean }) => {
        const context = useContext(RealtimeContext)

        useEffect(() => {
            if (!context || !mounted) return
            return context.subscribe('pedalos.changed', shared)
        }, [context, mounted])

        return null
    }

    const { rerender } = render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            <RawSubscriber mounted />
            <RawSubscriber mounted />
        </RealtimeProvider>,
    )

    // The start-up resync reaches both registrations, so it has to land before the counting starts.
    await waitFor(() => expect(shared).toHaveBeenCalledTimes(2))

    // One consumer goes away; the other is still mounted and must keep its own registration.
    rerender(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            <RawSubscriber mounted={false} />
            <RawSubscriber mounted />
        </RealtimeProvider>,
    )

    shared.mockClear()
    act(() =>
        connection.notify?.({
            entityId: '11111111-1111-1111-1111-111111111111',
            eventName: 'pedalos.changed',
            occurredAt: new Date().toISOString(),
        }),
    )

    expect(shared).toHaveBeenCalledTimes(1)
})

it('ignores a message that is not a valid envelope and reports it', async () => {
    realtimeTicket.mockResolvedValue({ data: enabledTicket })

    const pedalos = vi.fn()

    const Subscribers = () => {
        useRealtimeEvent('pedalos.changed', pedalos)
        return null
    }

    render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            <Subscribers />
        </RealtimeProvider>,
    )

    await waitFor(() => expect(pedalos).toHaveBeenCalledTimes(1))
    pedalos.mockClear()
    warn.mockClear()

    connection.notify?.({ eventName: 'pedalos.changed', entityId: 42 })

    expect(pedalos).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(
        'Ignored a realtime message that is not a valid envelope',
        expect.anything(),
    )
})

it('reports an async subscriber that rejects and still notifies the others', async () => {
    realtimeTicket.mockResolvedValue({ data: enabledTicket })

    const rejecting = vi.fn(async () => {
        await Promise.resolve()
        throw new Error('a refetch failed')
    })
    const healthy = vi.fn()

    const Subscribers = () => {
        useRealtimeEvent('pedalos.changed', rejecting)
        useRealtimeEvent('pedalos.changed', healthy)
        return null
    }

    render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            <Subscribers />
        </RealtimeProvider>,
    )

    await waitFor(() => expect(healthy).toHaveBeenCalled())
    await waitFor(() =>
        expect(warn).toHaveBeenCalledWith(
            'A realtime subscriber failed while handling a signal',
            expect.any(Error),
        ),
    )
    expect(rejecting).toHaveBeenCalled()
})

it('retries the first ticket request until the API answers', async () => {
    realtimeTicket
        .mockRejectedValueOnce(new Error('503 while the API starts'))
        .mockResolvedValue({ data: enabledTicket })

    const { getByTestId } = render(
        <RealtimeProvider
            fetchTicket={fetchTicket}
            onError={warn}
            tenantId="tenant-a"
        >
            <StatusBadge />
        </RealtimeProvider>,
    )

    // An API that refuses the first ticket while it starts must not keep the channel down for the session.
    await waitFor(
        () => expect(getByTestId('status').textContent).toBe('connected'),
        { timeout: 5000 },
    )
    expect(realtimeTicket).toHaveBeenCalledTimes(2)
    expect(warn).toHaveBeenCalledWith(
        'Could not obtain a realtime ticket (attempt 1), retrying',
        expect.any(Error),
    )
})
