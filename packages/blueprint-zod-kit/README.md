# @collana-solutions/blueprint-zod-kit

Zod v4 integration for a .NET backend: the Orval `stringFormat` polyfill, and a global error
map that renders the backend's own FluentValidation vocabulary so client and server messages
match in every language.

Part of [csag-blueprint-react](https://github.com/neolution-ch/csag-blueprint-react). All
packages in that repository are released in lockstep — install them at the same version.

## Install

```bash
pnpm add @collana-solutions/blueprint-zod-kit
pnpm add zod
```

## Quick start

```ts
// once, at the app entry point, before any generated schema module
import '@collana-solutions/blueprint-zod-kit/install'
```

Then publish the current language whenever translations change:

```ts
setZodValidationMessages(translations.validation, translations.fields)
setZodValidationLocale(languageCode)
```

`z.config` is a module-level singleton while translations live in React context, which is why
the two are bridged by an explicit call rather than a hook.

## API

| Export                                    | Kind     | What it does                                                                                                                                                                                                                            |
| ----------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `installZodErrorMap`                      | function | Registers the error map on Zod's global config.                                                                                                                                                                                         |
| `applyStringFormatPatch`                  | function | Polyfills `.stringFormat()`, which Orval emits and Zod v4 does not provide.                                                                                                                                                             |
| `setZodValidationMessages`                | function | Publishes the current language's messages and field labels. Pass `null` to clear. Generic over the field labels, so a generated interface can be passed directly.                                                                       |
| `setZodValidationLocale`                  | function | Sets the built-in Zod locale used as the fallback layer. Regional codes map to their base language.                                                                                                                                     |
| `ZodValidationMessages` / `ZodFieldNames` | type     | The message shape, declared structurally so a generated translations type satisfies it without this package depending on your generated code.                                                                                           |
| `ZodFieldNamesOf<T>`                      | type     | Constraint used for the field labels. Accepts a named interface, which a bare `Record` cannot: TypeScript gives interfaces no implicit index signature, so a record parameter would force callers to spread theirs into a fresh object. |

Only `de`, `en`, `fr` and `it` have a built-in Zod locale wired up here; any other language
code falls back to English for the messages this map does not handle itself.

Issue codes the map does not handle explicitly fall through to the built-in Zod locale rather
than reverting to English.

## License

MIT
