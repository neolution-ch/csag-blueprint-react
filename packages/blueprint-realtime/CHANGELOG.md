# @collana-solutions/blueprint-realtime

## 0.3.0

### Minor Changes

- [#25](https://github.com/neolution-ch/csag-blueprint-react/pull/25) [`a2efc1f`](https://github.com/neolution-ch/csag-blueprint-react/commit/a2efc1fbbf8c7657df0a8c31904c97066bccff9a) Thanks [@neotrow](https://github.com/neotrow)! - Add `@collana-solutions/blueprint-realtime`, the browser side of the real-time channel
  
  `RealtimeProvider` connects to Azure SignalR Service with a ticket the host fetches (`fetchTicket`), keyed on the active tenant, and reports what it swallows to `onError`. `useRealtimeEvent(eventName, handler)` subscribes, with async handlers allowed, and also runs the handler without a payload after every connect so a subscriber can resync. `useRealtimeStatus()` reports the connection state. Every message is validated against `realtimeEventPayloadSchema` before a subscriber sees it. `@microsoft/signalr` is a peer dependency, imported only once a ticket enables real-time.
  
  `@collana-solutions/blueprint-realtime/testing` provides `createRealtimeTestChannel()` and `RealtimeTestProvider`, so a component test can deliver events to its subscribers without a connection.
