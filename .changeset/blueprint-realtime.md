---
'@collana-solutions/blueprint-realtime': minor
---

Add `@collana-solutions/blueprint-realtime`, the browser side of the real-time channel

`RealtimeProvider` connects to Azure SignalR Service with a ticket the host fetches (`fetchTicket`), keyed on the active tenant, and reports what it swallows to `onError`. `useRealtimeEvent(eventName, handler)` subscribes, with async handlers allowed, and also runs the handler without a payload after every connect so a subscriber can resync. `useRealtimeStatus()` reports the connection state. Every message is validated against `realtimeEventPayloadSchema` before a subscriber sees it. `@microsoft/signalr` is a peer dependency, imported only once a ticket enables real-time.
