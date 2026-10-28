# @collana-solutions/blueprint-i18n

Typed translation kit: a generic translation-context factory, client-side cache and ETag
helpers, a recovery guard for the empty-translations failure mode, and date and time
formatters that format in the UI language.

Part of [csag-blueprint-react](https://github.com/neolution-ch/csag-blueprint-react). All
packages in that repository are released in lockstep — install them at the same version.

## Install

```bash
pnpm add @collana-solutions/blueprint-i18n
pnpm add react @mantine/core
```

## Quick start

```tsx
import { createTranslationKit } from '@collana-solutions/blueprint-i18n'

const kit = createTranslationKit<MyTranslations>()
export const TranslationProvider = kit.TranslationProvider
export const useT = kit.useTranslations
```

The kit is generic over your own translations type, so the whole tree stays typed without
this package knowing anything about your keys.

## API

| Export                             | Kind      | What it does                                                                                                                                                          |
| ---------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createTranslationKit<T>`          | factory   | Returns a `TranslationContext`, `TranslationProvider`, `useTranslations` and `useLanguageCode` bound to your translations type.                                       |
| `TranslationGuard`                 | component | Detects an empty translations payload, clears the caches once and reloads, rather than rendering a UI of blank strings. Its own copy is overridable through `labels`. |
| `resolveClientTranslations`        | function  | Resolves from the server response, then the cache, then the caller's fallback.                                                                                        |
| `readStoredTranslations`           | function  | Reads the cached payload for a language, or null when missing or not the shape `persistTranslations` writes.                                                          |
| `persistTranslations`              | function  | Writes payload and ETag to local storage.                                                                                                                             |
| `clearTranslationCaches`           | function  | Drops both.                                                                                                                                                           |
| `getPersistedTranslationsLanguage` | function  | The language of whatever is currently cached.                                                                                                                         |
| `translationKeysToDebugObject`     | function  | Replaces every value with its own key, for a show-translation-keys debug mode.                                                                                        |
| `formatMessage`                    | function  | Substitutes `{Key}` placeholders, the syntax the backend emits. Unknown placeholders pass through unchanged.                                                          |
| `interpolate`                      | function  | **Deprecated.** Substitutes `{{key}}` placeholders. Use `formatMessage`.                                                                                              |
| `DateTimeFormatProvider`           | component | Binds the date and time formatters to the UI language and the default place zone. See [Dates and times](#dates-and-times).                                            |
| `useDateTimeFormat`                | hook      | The bound formatters.                                                                                                                                                 |
| `formatInstant` … `viewerTimeZone` | function  | The pure formatters, each taking the locale explicitly.                                                                                                               |

### A cached payload is validated before it is trusted

`localStorage` outlives deployments, so an entry written by an older version of an app can
still be there when newer code reads it. `readStoredTranslations` rejects anything that is not
the `{ data, etag }` shape `persistTranslations` writes, and `resolveClientTranslations` treats
a rejected entry as a cache miss and returns the caller's fallback. That is what lets
`TranslationGuard` observe an empty payload and recover, instead of a consumer throwing on its
first property access before the guard can render.

### Placeholders are single-brace

The blueprint backend stores validation copy with `{FieldName}`, `{Min}` and `{Max}`
placeholders, and `@collana-solutions/blueprint-zod-kit` fills that same syntax. Use
`formatMessage` for any string that still carries placeholders when it reaches the UI.
`interpolate` uses double braces, matches nothing the backend emits, and is deprecated.

## Dates and times

One formatter per kind of temporal value the backend sends. Each takes the wire string as it
arrives, and none of them hands a string to `new Date()`.

| Formatter                         | Wire value                                  | Shown                                                                                    |
| --------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `formatInstant(value, opts)`      | `2026-10-21T08:00:00Z`, or any offset       | In the viewer's zone, or in `opts.timeZone`. A zone other than the viewer's is labelled. |
| `formatPlaceTime(value, opts)`    | `2026-10-26T10:00:00` (local reading)       | As written. Labelled with `opts.placeZone`'s short name when the viewer is elsewhere.    |
| `formatDate(value, opts)`         | `2026-10-21`                                | As written; no zone is involved.                                                         |
| `formatTimeOfDay(value, opts)`    | `09:00:00`                                  | On the locale's 12- or 24-hour clock, without seconds.                                   |
| `formatDuration(minutes, opts)`   | `90`                                        | `1 hr, 30 min`. Hours and minutes, never days.                                           |
| `formatDateRange(from, to, opts)` | `2026-10-21`, `2026-10-25`, either optional | `21 – 25 Oct 2026`; an open side as `21 Oct 2026 –`.                                     |
| `todayAt(zone)`                   | —                                           | Today in that zone, as `YYYY-MM-DD`.                                                     |
| `viewerTimeZone()`                | —                                           | The browser's IANA zone.                                                                 |

Every formatter takes `locale` explicitly; nothing falls back to the browser's language. The
date-time formatters take `dateOnly` and `style` (`medium` by default, `short` for the
locale's numeric date with a four-digit year). `formatDuration` takes `style` as
`Intl.DurationFormat` names it (`short`, `long`, `narrow`) and falls back to `Intl.NumberFormat`
and `Intl.ListFormat` where `DurationFormat` is missing.

In a component, use the bound versions. `DateTimeFormatProvider` takes the default place zone
(the tenant's zone) and reads the locale from the nearest `TranslationProvider`:

```tsx
<TranslationProvider translations={translations} languageCode={languageCode}>
    <DateTimeFormatProvider placeZone={tenant.timeZoneId}>
        <Outlet />
    </DateTimeFormatProvider>
</TranslationProvider>
```

```ts
const { formatPlaceTime, formatInstant, todayAt } = useDateTimeFormat()

formatPlaceTime(reservation.startLocal) // "26 Oct 2026, 10:00", plus " CET" outside Zurich
formatPlaceTime(stand.opensLocal, { placeZone: stand.timeZoneId }) // a place with its own zone
formatInstant(order.createdAt) // in the viewer's zone
todayAt() // today in the default place zone
```

The tenant's zone is only the default. A place that sits elsewhere, such as a Zurich tenant's
stand at a fair in Miami, carries its own zone, and passing it as `placeZone` formats and labels
the reading in that zone's terms (`26 Oct 2026, 10:00 GMT-4`). An omitted or `undefined`
`placeZone` keeps the default.

Pass `locale` to the provider only to override the UI language. Without either, it throws
rather than guess.

### Values that do not parse

- `null`, `undefined` and `''` format as `''`.
- A value whose date part is `0001-01-01` also formats as `''`. That is what .NET serializes
  for an unassigned `DateTime`, `DateOnly` or `DateTimeOffset`, so it means "never set", not
  1 January of year 1.
- Any other value that is not of the expected kind is returned unchanged, the way
  `formatMessage` leaves an unknown placeholder in place: a contract mismatch shows up on
  screen instead of as a blank or a wrong date. An instant without an offset and a local
  reading with one are both mismatches.
- An unknown zone id throws a `RangeError`, as `Intl` does.

### Daylight-saving transitions

A local reading that happens twice (02:30 on the night clocks fall back) is labelled as the
earlier occurrence, the same rule the server applies. A reading that never happens (02:30 on
the night clocks spring forward) is invalid and the server rejects it; if one arrives anyway
it is still shown as written, never moved to 03:30.

## License

MIT
