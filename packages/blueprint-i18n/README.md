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

| Export                             | Kind      | What it does                                                                                                                    |
| ---------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `createTranslationKit<T>`          | factory   | Returns a `TranslationContext`, `TranslationProvider`, `useTranslations` and `useLanguageCode` bound to your translations type. |
| `TranslationGuard`                 | component | Detects an empty translations payload, clears the caches once and reloads, rather than rendering a UI of blank strings.         |
| `resolveClientTranslations`        | function  | Reads the persisted payload, revalidating with an ETag.                                                                         |
| `persistTranslations`              | function  | Writes payload and ETag to local storage.                                                                                       |
| `clearTranslationCaches`           | function  | Drops both.                                                                                                                     |
| `getPersistedTranslationsLanguage` | function  | The language of whatever is currently cached.                                                                                   |
| `translationKeysToDebugObject`     | function  | Replaces every value with its own key, for a show-translation-keys debug mode.                                                  |
| `interpolate`                      | function  | Substitutes `{{key}}` placeholders; unknown keys pass through unchanged.                                                        |

## License

MIT
