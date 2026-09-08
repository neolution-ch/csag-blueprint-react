/**
 * Structural mirror of the backend's `TranslationDefaults.Validation` namespace.
 *
 * Declared here rather than imported from the generated API model so that this package
 * carries no dependency on a specific backend's generated code. The generated
 * `TranslationValues['validation']` type is structurally assignable to this interface, so
 * a consuming app passes its own translations straight in — and if the backend ever drops
 * one of these keys, the app fails to type-check at that call site instead of silently
 * rendering "undefined" inside a validation message.
 *
 * `{FieldName}`, `{Min}` and `{Max}` placeholders match the backend's template style.
 */
export interface ZodValidationMessages {
  /** "{FieldName} is required." */
  fieldRequired: string
  /** "{FieldName} has an invalid value." */
  invalidValue: string
  /** "{FieldName} must be at least {Min} characters." */
  minLength: string
  /** "{FieldName} must be at most {Max} characters." */
  maxLength: string
  /** "{FieldName} must be greater than {Min}." */
  greaterThan: string
  /** "{FieldName} must be at least {Min}." */
  greaterThanOrEqual: string
  /** "{FieldName} must be at most {Max}." */
  maxValue: string
  /** "{FieldName} must contain at least one item." */
  collectionRequired: string
}

/** Localized field labels keyed by schema property name, e.g. `{ hourlyRate: 'Stundensatz' }`. */
export type ZodFieldNames = Readonly<Record<string, string | undefined>>
