# @collana-solutions/blueprint-i18n

## 0.3.0

No changes in this release.

## 0.2.0

### Minor Changes

- [#18](https://github.com/neolution-ch/csag-blueprint-react/pull/18) [`7804b6c`](https://github.com/neolution-ch/csag-blueprint-react/commit/7804b6c8280f9d155f20907583acb662dfb2c380) Thanks [@neotrow](https://github.com/neotrow)! - Format and edit dates and times by what kind of value they are, in the UI language, with no
  shift from the browser's time zone.
  
  **Breaking: `DateTimeInputField` holds a local reading.** The field stores and accepts
  `YYYY-MM-DDTHH:mm:ss`, a clock reading with no offset, and the server resolves it against the
  place's time zone. It used to append the browser's offset for *today*, so a booking made on
  21 October for 26 October 10:00 in Zurich was sent as `+02:00` and stored as 09:00 once the
  clocks had changed.
  
  To migrate a `field.DateTimeInput`:
  
  - Change the property behind it to a local reading (a `DateTime` in the C# DTO, declared in
    the OpenAPI document as `format: date-time-local` rather than `date-time`) and resolve it
    against the tenant's zone on the server. Regenerate the client, so the generated zod schema
    stops demanding an offset.
  - A value that still arrives with an offset or `Z` is read as the instant it is, shown as the
    viewer's clock reading, and left untouched until the user picks a new value; the next change
    emits a local reading. In development (`setDevMode(true)`) the field warns once.
  - If the property must stay an instant, render your own field over `useFieldContext` until it
    can move. Do not add the offset back on the client: the browser cannot know the place's zone.
  
  **Date and time formatters in `blueprint-i18n`.** `formatInstant`, `formatPlaceTime`,
  `formatDate`, `formatTimeOfDay`, `formatDuration`, `formatDateRange`, `todayAt` and
  `viewerTimeZone`, all on `Intl`, each taking the locale explicitly. `DateTimeFormatProvider`
  takes the tenant's zone as the default place zone, and `useDateTimeFormat()` returns the
  formatters bound to it and to the language of the nearest `TranslationProvider`, which now
  publishes that language for them. The bound `formatPlaceTime` takes an optional `placeZone` for
  a place that carries its own zone (a stand at a fair abroad); omitted or `undefined`, the
  default applies. A place time is shown as written and labelled with the place zone's short name
  only for a viewer in another zone. `viewerTimeZone()` is cached for a minute and re-read when
  the tab regains focus or visibility. A value whose date part is `0001-01-01`, the .NET default for an
  unassigned date, formats as empty; any other value of the wrong kind is returned unchanged.
  
  **`DateInputField` follows the locale.** The default `valueFormat` is the `DatesProvider`
  locale's numeric date (`DD.MM.YYYY` for de-CH, `MM/DD/YYYY` for en-US) instead of a fixed
  `DD.MM.YYYY`, and typed input is parsed with whatever format is shown, including one you pass.
  Days and months may be typed with or without a leading zero, month names in a passed format
  are read in the `DatesProvider` locale (matched to the lower-case key dayjs registers, then to
  the language), and an incomplete or impossible date such as `31.02.2026` is rejected. The kit
  loads dayjs's `customParseFormat` plugin itself, so an app's own `dayjs.extend` call becomes
  redundant (keeping it is harmless). `DateTimeInputField` shows its date the same way and uses
  the locale's 12- or 24-hour clock.
  
  **New `TimeInputField`**, registered as `field.TimeInput`: a Mantine `TimePicker` holding
  `HH:mm:ss`, the format System.Text.Json writes for a `TimeOnly`, on the locale's 12- or
  24-hour clock. Erasing one segment leaves the others as typed while the form value is null; a
  reset or `setFieldValue` from outside shows the value written, including a null the form
  already held.

## 0.1.2

## 0.1.1

### Patch Changes

- [#8](https://github.com/neolution-ch/csag-blueprint-react/pull/8) [`36df95e`](https://github.com/neolution-ch/csag-blueprint-react/commit/36df95e22b522f3d0eb4b9bfeccc1d22c811015c) Thanks [@neotrow](https://github.com/neotrow)! - Close the contract gaps that the first consuming app had to work around, and take in the
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
  
  **Dev-only diagnostics can be switched on again.** The form kit decided whether to emit its
  development warnings by reading `import.meta.env.DEV`. Vite injects that into app source but not
  into a dependency it pre-bundles out of `node_modules`, so every diagnostic in the kit — the
  orphan-field warning in `useSchemaForm` most of all — went silent the moment this code stopped
  being vendored app source. Reading `process.env.NODE_ENV` instead does not help: these packages
  are built with rolldown's browser platform, which inlines that expression at build time and would
  freeze one value into the published artifact. A published package genuinely cannot work this out
  for itself, so the new `setDevMode` lets the consumer say. Call it once at start-up with
  `setDevMode(import.meta.env.DEV)`, from your own source where the bundler does substitute. The
  old heuristic remains the default, so consuming the packages as source keeps working unchanged.
  
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

## 0.1.0

### Minor Changes

- [`af515c1`](https://github.com/neolution-ch/csag-blueprint-react/commit/af515c12096b62d016ef6c27c4acb63b0ef7a111) - Initial release of the CSAG Blueprint React packages, extracted from
  [csag-blueprint-web](https://github.com/neolution-ch/csag-blueprint-web).
  
  Six packages, versioned in lockstep:
  
  - **blueprint-core** — RFC 9457 Problem Details vocabulary and the FastEndpoints
    validation-error parser.
  - **blueprint-i18n** — typed translation kit: context factory, client cache and ETag helpers,
    empty-translations recovery guard.
  - **blueprint-form-kit** — TanStack Form + Mantine + Zod form kit.
  - **blueprint-api-kit** — axios and TanStack Query plumbing, plus the Orval client factories.
  - **blueprint-zod-kit** — Zod v4 integration for a .NET backend.
  - **blueprint-theming** — white-label tenant theming.
  
  Everything these packages previously reached for inside the app is now injected by the
  consumer: the form kit takes its eight user-visible strings from a labels provider with
  English defaults, the zod kit declares its message shape structurally rather than importing a
  generated type, theming takes the base Mantine theme as a parameter, and the api kit exposes
  factories instead of module-level singletons.
