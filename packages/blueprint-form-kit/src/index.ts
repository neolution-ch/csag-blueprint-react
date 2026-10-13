export { useAppForm, withForm } from './useAppForm'
export { useSchemaForm } from './useSchemaForm'
export { FormSkeleton } from './FormSkeleton'

// Call once at start-up with `import.meta.env.DEV`. A published package cannot detect a
// development build on its own; see the note on setDevMode for why.
export { setDevMode } from './dev-mode'
export {
  fieldContext,
  useFieldContext,
  useFormContext,
  formContext,
} from './form-context'

export type { FormKitLabels, PartialFormKitLabels } from './labels'
export {
  FormKitLabelsProvider,
  useFormKitLabels,
  defaultFormKitLabels,
} from './labels'

// The field components `useAppForm` registers as `field.TextInput`, `field.Select` and so on.
// Reach for `field.*` inside a form; these named exports are for the cases that map cannot
// serve: composing one into an app-specific field, or rendering a field outside `AppField`.
// Note that the registry itself is fixed — a consumer cannot add an eleventh member — so an
// app-coupled field is written as a plain component that calls `useFieldContext` and is
// rendered as the body of `form.AppField`.
export {
  TextInputField,
  PasswordInputField,
  NumberInputField,
  SelectField,
  MultiSelectField,
  DateInputField,
  DateTimeInputField,
  FileInputField,
  CheckboxField,
  ColorInputField,
} from './fields'

// Re-exported so that consumers keep reaching server-error parsing through the form kit,
// which is where it is actually used. It lives in blueprint-core because the axios and
// query plumbing needs the same parser without taking on this package's peer dependencies.
export type { ParsedServerErrors } from '@collana-solutions/blueprint-core'
export { parseServerErrors } from '@collana-solutions/blueprint-core'
