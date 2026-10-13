# @collana-solutions/blueprint-i18n

Typed translation kit: a generic translation-context factory, client-side cache and ETag
helpers, and a recovery guard for the empty-translations failure mode.

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

## License

MIT
