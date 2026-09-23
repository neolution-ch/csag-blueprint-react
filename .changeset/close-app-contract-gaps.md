---
'@collana-solutions/blueprint-core': patch
'@collana-solutions/blueprint-i18n': patch
'@collana-solutions/blueprint-form-kit': patch
'@collana-solutions/blueprint-api-kit': patch
'@collana-solutions/blueprint-zod-kit': patch
'@collana-solutions/blueprint-theming': patch
---

Close the contract gaps that the first consuming app had to work around, and take in the
generic helpers it was still holding. Everything here is additive or a fix; no existing call
site has to change.

**Internal dependencies are pinned exactly.** `blueprint-form-kit` and `blueprint-api-kit`
declared `blueprint-core` as `workspace:^`, which published as `^0.1.0`. A consumer pinning
core exactly would, on the next release, resolve a second copy of core underneath those two
packages while its own direct dependency stayed behind. `workspace:*` publishes the exact
version, which is what the lockstep `fixed` group already promises.

**A corrupt translation cache no longer produces a crash.** `resolveClientTranslations`
returned `JSON.parse(stored).data` unchecked, so a `{"data":null}` entry — an older schema, or
a write truncated by a quota error — resolved to `null` and threw at the consumer's first
property access, before `TranslationGuard` could reload. Validation moved to a new exported
`readStoredTranslations`, and an entry that fails it is treated as a cache miss.

**Dev-only diagnostics work again inside a bundle.** `isDevMode` read `import.meta.env`, which
Vite injects into app source but not into a pre-bundled dependency, so every development
warning in the form kit went silent the moment the kit stopped being vendored app code.
It now prefers `process.env.NODE_ENV`, which Vite's dependency optimizer does define, and which
rollup, webpack, esbuild and Jest set too.

**Labels accept `null`.** `PartialFormKitLabels` leaves take `string | null | undefined`.
A generated client whose backend marks a translation column nullable produces `string | null`,
which previously forced a `?? undefined` at every call site purely to satisfy the compiler.
`mergeLabels` already discarded non-strings, so runtime behaviour is unchanged.

**Field names accept a generated interface.** `setZodValidationMessages` is generic over its
`fields` argument, so a named interface can be passed directly instead of being spread into a
fresh object to acquire an index signature. Adds `ZodFieldNamesOf<T>`.

**English copy is now overridable.** `setErrorNotificationLabels` overrides the error toast's
five strings; the toast is raised from axios interceptors and query-cache handlers, so a
module-level setter is the same bridge the zod kit already uses. `TranslationGuard` takes a
`labels` prop for its recovery and failure screens.

**CSS custom property names are configurable.** `buildTenantCssVars` takes an optional
`varNames`, so a consumer whose stylesheet does not declare `--accent` and friends can still
use it. Defaults are unchanged.

**The field components are exported.** `TextInputField`, `SelectField` and the rest are now
named exports. The `useAppForm` registry itself stays fixed — an app-coupled field is still
written as a plain component over `useFieldContext` and rendered inside `form.AppField` — but
the components can now be composed directly. The `fields` barrel was also missing two of the
ten it claimed to re-export.

**`formatMessage` fills the placeholder syntax the stack actually speaks.** The backend stores
validation copy with single-brace `{FieldName}` placeholders and the zod error map fills the
same syntax, but the only helper shipped here used `{{key}}`, so it never matched a blueprint
translation string and every consumer re-implemented the single-brace version. `interpolate`
is deprecated and kept for one minor.

Tests were added for the cache validation, both placeholder syntaxes, and the label defaults.
