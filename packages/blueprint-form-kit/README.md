# @collana-solutions/blueprint-form-kit

TanStack Form + Mantine + Zod form kit: a schema-driven form hook, eleven registered field
components, server-error mapping and an unsaved-changes guard.

Part of [csag-blueprint-react](https://github.com/neolution-ch/csag-blueprint-react). All
packages in that repository are released in lockstep — install them at the same version.

## Install

```bash
pnpm add @collana-solutions/blueprint-form-kit
pnpm add react @mantine/core @mantine/dates @mantine/modals @tanstack/react-form \
  @tanstack/react-store @tanstack/react-router zod dayjs lucide-react
```

## Quick start

```tsx
const form = useSchemaForm({
  schema: createPedaloSchema,
  onSubmit: async (value) => {
    await createPedalo({ data: value })
  },
  guardUnsavedChanges: true,
})

<form.AppField name="name">
  {(field) => <field.TextInput label="Name" />}
</form.AppField>
<form.ServerErrorAlert />
<form.SubmitButton />
```

Always use `form.AppField` with the registered field components rather than importing Mantine
inputs directly: the registered ones handle value binding, blur tracking and error display.

## Labels

The kit renders nine strings of its own. With no provider it uses English defaults, which is
what keeps it working before an app's translations have loaded. To localize them, wrap the
tree in `FormKitLabelsProvider` and pass your own.

An explicit `undefined` or `null` falls back to the default rather than overriding it, so a key
that has not arrived from the API yet never reaches the DOM as the string `undefined`. `null` is
accepted because a generated client whose backend marks those columns nullable produces
`string | null`; without it every call site would need a `?? undefined` that looks like a
runtime guard but only satisfies the compiler.

### Server error banner titles

`<form.ServerErrorAlert />` picks its title from the status of what it shows: `requestRejected`
("Could not complete the request") for a refused request (4xx) — wrong credentials, a booking
conflict, a failed business rule — and `serverError` ("Server error") for a 5xx, or 0 when no
response arrived. Everything `useSchemaForm` maps onto the form is a 4xx.

When you catch a server answer yourself and show it in the banner, pass its status beside the
message:

```ts
form.setErrorMap({ onServer: { form: message, status: error.status } } as never)
```

Leave `fields` out of that object. TanStack Form keeps only `form` from an object that has
`fields`, so the status would be dropped. Without a status the banner uses `requestRejected`.

## API

| Export                                                                | Kind      | What it does                                                                                                                                                             |
| --------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useSchemaForm`                                                       | hook      | Zod-driven form: empty-string coercion for nullish fields, server-error mapping, orphan-field warnings in development, and an optional unsaved-changes navigation guard. |
| `useAppForm` / `withForm`                                             | hook      | The `createFormHook` pair, with every field and form component registered.                                                                                               |
| `FormSkeleton`                                                        | component | Derives a loading skeleton from a Zod object schema.                                                                                                                     |
| `FormKitLabelsProvider` / `useFormKitLabels` / `defaultFormKitLabels` | —         | The label contract described above.                                                                                                                                      |
| `parseServerErrors`                                                   | function  | Re-exported from `blueprint-core`, where the axios and query plumbing needs it too.                                                                                      |
| `setDevMode`                                                          | function  | Declares whether this is a development build. See below.                                                                                                                 |
| `fieldContext` / `formContext` / `useFieldContext` / `useFormContext` | —         | The underlying TanStack Form contexts.                                                                                                                                   |

### Development diagnostics

`useSchemaForm` warns about orphan field errors in development. Call `setDevMode` once at
start-up so it knows when that is:

```ts
setDevMode(import.meta.env.DEV)
```

It has to come from you. `import.meta.env` is injected by Vite's import-analysis plugin, which
runs over **app source**; a dependency pre-bundled out of `node_modules` never sees it, so the
kit's own fallback reads false under `vite dev`. `process.env.NODE_ENV` is not an alternative
either: this package is built with rolldown's browser platform, which inlines that expression at
build time and would ship one frozen value to everyone. Without the call the diagnostics simply
stay quiet, which is also the right behaviour in production.

Registered fields: `TextInput`, `PasswordInput`, `NumberInput`, `Select`, `MultiSelect`,
`DateInput`, `DateTimeInput`, `TimeInput`, `FileInput`, `Checkbox`, `ColorInput`.

The same components are also named exports (`TextInputField`, `SelectField`, and so on) for
the cases `field.*` cannot serve, such as composing one inside an app-specific field.

### A field this kit does not ship

The registry is fixed: it is built once inside the package, so a consumer cannot add a
twelfth member or replace one. A field that needs data only your app has — a generated
endpoint, your own translations — is written as an ordinary component that calls
`useFieldContext`, and rendered as the body of `form.AppField`:

```tsx
import { useFieldContext } from '@collana-solutions/blueprint-form-kit'

function UploadField({ label }: { label: string }) {
    const field = useFieldContext<File | null>()
    // …render your input, then call field.handleChange(file)
}

;<form.AppField name="image" children={() => <UploadField label="Image" />} />
```

`AppField` establishes the same context either way, so validation, blur tracking and error
display behave exactly as they do for a registered field.

## Date and time fields

Each holds the string the API sends and expects, never a `Date`:

| Field           | Form value                                        | Mantine component |
| --------------- | ------------------------------------------------- | ----------------- |
| `DateInput`     | `YYYY-MM-DD`                                      | `DateInput`       |
| `DateTimeInput` | `YYYY-MM-DDTHH:mm:ss`, a local reading, no offset | `DateTimePicker`  |
| `TimeInput`     | `HH:mm:ss`                                        | `TimePicker`      |

An empty field is `null`.

**Display follows the `DatesProvider` locale.** Set it to the UI language
(`<DatesProvider settings={{ locale: languageCode }}>`), the same setting Mantine uses for the
calendar's month and weekday names. The date shows in that locale's numeric form
(`DD.MM.YYYY` for de-CH, `DD/MM/YYYY` for en-GB, `MM/DD/YYYY` for en-US) and the time on its
12- or 24-hour clock. A `valueFormat` (or, for `TimeInput`, a `format`) you pass wins, and
`DateInput` parses typed input with whichever format it shows. Days and months may be typed
with or without a leading zero (`1.2.2026`, `1.02.2026`), and an impossible date such as
`31.02.2026` is rejected. Month names in a `valueFormat` (`DD MMM YYYY`) are read in the
`DatesProvider` locale, provided the app has loaded that dayjs locale (`dayjs/locale/de-ch`);
the kit matches `de-CH` to the `de-ch` key, then to `de`. The kit loads dayjs's
`customParseFormat` plugin itself; an app no longer needs to.

**`DateTimeInput` holds a place's clock reading.** What the user picks is what is stored:
`2026-10-26T10:00:00` means 10:00 on the place's clock, and the server resolves it against the
place's time zone. The browser's zone never adds an offset.

A value that arrives with an offset or `Z` is an instant, not a reading. The field shows it as
the viewer's clock reading, the same reading every other instant in the UI shows, and leaves
the form value untouched until the user picks something, which is then emitted as a local
reading. In development (see `setDevMode`) it warns once per field.

Mantine's picker works on local `Date` objects, so a reading inside a daylight-saving gap of
the **viewer's** zone (02:30 on the night clocks spring forward there) comes back an hour
later. Such a reading is invalid when the viewer's zone is the place's zone, and the server
rejects it.

## License

MIT
