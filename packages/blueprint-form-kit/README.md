# @collana-solutions/blueprint-form-kit

TanStack Form + Mantine + Zod form kit: a schema-driven form hook, ten registered field
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

The kit renders eight strings of its own. With no provider it uses English defaults, which is
what keeps it working before an app's translations have loaded. To localize them, wrap the
tree in `FormKitLabelsProvider` and pass your own.

An explicit `undefined` or `null` falls back to the default rather than overriding it, so a key
that has not arrived from the API yet never reaches the DOM as the string `undefined`. `null` is
accepted because a generated client whose backend marks those columns nullable produces
`string | null`; without it every call site would need a `?? undefined` that looks like a
runtime guard but only satisfies the compiler.

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
`DateInput`, `DateTimeInput`, `FileInput`, `Checkbox`, `ColorInput`.

The same components are also named exports (`TextInputField`, `SelectField`, and so on) for
the cases `field.*` cannot serve, such as composing one inside an app-specific field.

### A field this kit does not ship

The registry is fixed: it is built once inside the package, so a consumer cannot add an
eleventh member or replace one. A field that needs data only your app has — a generated
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

## License

MIT
