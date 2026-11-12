# @collana-solutions/blueprint-realtime

The browser side of the CSAG Blueprint real-time channel. The API publishes tenant-scoped **signals**
through Azure SignalR Service in serverless mode (`Csag.Blueprint.Realtime.AzureSignalR` on NuGet).
This package connects to it with a ticket from the API and hands each signal to the components that
subscribe to its event name.

A signal names a record and nothing else: `{ eventName, entityId, occurredAt }`. A subscriber reacts
by invalidating a query and refetching through the normal API, where authorization still applies.

## Install

```bash
pnpm add @collana-solutions/blueprint-realtime @microsoft/signalr zod
```

`@microsoft/signalr` is loaded with a dynamic import only once a ticket says real-time is on, so an
environment without a provider never downloads it.

## Use

Mount the provider once, inside the signed-in, tenant-scoped part of the app:

```tsx
import { RealtimeProvider } from '@collana-solutions/blueprint-realtime'

const fetchTicket = async (signal: AbortSignal) => {
    const response = await getRealtime().realtimeTicket({
        signal,
        __suppressToast: true,
    })
    return response.data
}

export const ProtectedLayout = ({ tenantId }: { tenantId?: string }) => (
    <RealtimeProvider tenantId={tenantId} fetchTicket={fetchTicket} onError={(message, error) => logger.warn({ err: error }, message)}>
        <AppShell />
    </RealtimeProvider>
)
```

- `tenantId` keys the connection. A tenant switch tears it down and asks for a new ticket, because
  group membership is granted per tenant when the ticket is issued. Without a tenant the channel is
  `disabled`.
- `fetchTicket` is called for the first connection and again for every retry and reconnect. Pass the
  signal on, so a tenant switch cancels a request in flight.
- `onError` receives what the channel swallows: a failed ticket, a failed connect, a subscriber that
  threw, a message that is not a valid envelope. It defaults to `console.warn`.

Subscribe anywhere below it:

```tsx
import { useRealtimeEvent } from '@collana-solutions/blueprint-realtime'

useRealtimeEvent('example.reservation.created', async () => {
    await queryClient.invalidateQueries({ queryKey: reservationListKey })
})
```

- The handler also runs **without a payload** whenever the connection starts or comes back, because
  nothing published while the socket was down is replayed. A handler that only invalidates needs no
  special case.
- Handlers may be async. A rejection is reported to `onError` and never stops the other subscribers.
- An inline arrow is fine: the hook keeps the latest handler without resubscribing.

`useRealtimeStatus()` returns `disabled`, `connecting`, `connected`, `reconnecting` or
`disconnected`, for a diagnostics view. Ordinary screens do not need it.

## Validation

Every incoming message is checked against `realtimeEventPayloadSchema` (zod) before a subscriber sees
it. A message that does not match is dropped and reported.
