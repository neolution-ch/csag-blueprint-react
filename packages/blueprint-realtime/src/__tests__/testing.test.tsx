// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { createRealtimeTestChannel, RealtimeTestProvider } from '../testing'
import { useRealtimeEvent } from '../useRealtimeEvent'
import { useRealtimeStatus } from '../useRealtimeStatus'

afterEach(cleanup)

const payload = {
    eventName: 'pedalos.changed',
    entityId: '11111111-1111-1111-1111-111111111111',
    occurredAt: '2026-11-13T10:00:00+00:00',
}

it('delivers an emitted event to the subscribers of its name only', async () => {
    const channel = createRealtimeTestChannel()
    const pedalos = vi.fn()
    const customers = vi.fn()

    const Subscribers = () => {
        useRealtimeEvent('pedalos.changed', pedalos)
        useRealtimeEvent('customers.changed', customers)
        return null
    }

    render(
        <RealtimeTestProvider channel={channel}>
            <Subscribers />
        </RealtimeTestProvider>,
    )

    await act(() => channel.emit(payload))

    expect(pedalos).toHaveBeenCalledWith(payload)
    expect(customers).not.toHaveBeenCalled()
})

it('waits for an async handler before emit resolves', async () => {
    const channel = createRealtimeTestChannel()

    const Subscriber = () => {
        const [seen, setSeen] = useState('nothing')
        useRealtimeEvent('pedalos.changed', async (event) => {
            await Promise.resolve()
            setSeen(event?.entityId ?? 'resync')
        })
        return <p>{seen}</p>
    }

    render(
        <RealtimeTestProvider channel={channel}>
            <Subscriber />
        </RealtimeTestProvider>,
    )

    await act(() => channel.emit(payload))

    expect(screen.getByText(payload.entityId)).toBeTruthy()
})

it('resyncs every subscriber without a payload', async () => {
    const channel = createRealtimeTestChannel()
    const pedalos = vi.fn()
    const customers = vi.fn()

    const Subscribers = () => {
        useRealtimeEvent('pedalos.changed', pedalos)
        useRealtimeEvent('customers.changed', customers)
        return null
    }

    render(
        <RealtimeTestProvider channel={channel}>
            <Subscribers />
        </RealtimeTestProvider>,
    )

    await act(() => channel.resync())

    expect(pedalos).toHaveBeenCalledWith(undefined)
    expect(customers).toHaveBeenCalledWith(undefined)
})

it('reports subscriptions while mounted only', () => {
    const channel = createRealtimeTestChannel()

    const Subscriber = () => {
        useRealtimeEvent('pedalos.changed', vi.fn())
        return null
    }

    const { unmount } = render(
        <RealtimeTestProvider channel={channel}>
            <Subscriber />
        </RealtimeTestProvider>,
    )

    expect(channel.isSubscribed('pedalos.changed')).toBe(true)
    unmount()
    expect(channel.isSubscribed('pedalos.changed')).toBe(false)
})

it('rejects emit when a handler fails', async () => {
    const channel = createRealtimeTestChannel()

    const Subscriber = () => {
        useRealtimeEvent('pedalos.changed', () => {
            throw new Error('a screen blew up')
        })
        return null
    }

    render(
        <RealtimeTestProvider channel={channel}>
            <Subscriber />
        </RealtimeTestProvider>,
    )

    await expect(channel.emit(payload)).rejects.toThrow('a screen blew up')
})

it('reports the status it is given', () => {
    const channel = createRealtimeTestChannel()

    const Status = () => <p>{useRealtimeStatus()}</p>

    render(
        <RealtimeTestProvider channel={channel} status="reconnecting">
            <Status />
        </RealtimeTestProvider>,
    )

    expect(screen.getByText('reconnecting')).toBeTruthy()
})
