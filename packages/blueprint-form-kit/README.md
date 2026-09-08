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

An explicit `undefined` falls back to the default rather than overriding it, so a key that has
not arrived from the API yet never reaches the DOM as the string `undefined`.

## API

| Export                                                                | Kind      | What it does                                                                                                                                                             |
| --------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useSchemaForm`                                                       | hook      | Zod-driven form: empty-string coercion for nullish fields, server-error mapping, orphan-field warnings in development, and an optional unsaved-changes navigation guard. |
| `useAppForm` / `withForm`                                             | hook      | The `createFormHook` pair, with every field and form component registered.                                                                                               |
| `FormSkeleton`                                                        | component | Derives a loading skeleton from a Zod object schema.                                                                                                                     |
| `FormKitLabelsProvider` / `useFormKitLabels` / `defaultFormKitLabels` | —         | The label contract described above.                                                                                                                                      |
| `parseServerErrors`                                                   | function  | Re-exported from `blueprint-core`, where the axios and query plumbing needs it too.                                                                                      |
| `fieldContext` / `formContext` / `useFieldContext` / `useFormContext` | —         | The underlying TanStack Form contexts.                                                                                                                                   |

Registered fields: `TextInput`, `PasswordInput`, `NumberInput`, `Select`, `MultiSelect`,
`DateInput`, `DateTimeInput`, `FileInput`, `Checkbox`, `ColorInput`.

## License

MIT
