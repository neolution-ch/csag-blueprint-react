import type { AnyFormApi } from '@tanstack/react-form'
import { useBlocker } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import { modals } from '@mantine/modals'
import { useEffect } from 'react'
import { z } from 'zod'
import { useAppForm } from './useAppForm'
import { parseServerErrors } from '@collana-solutions/blueprint-core'
import { useFormKitLabels } from './labels'
import { isDevMode } from './dev-mode'

/**
 * Check whether any `onServer` errors exist — either at the form level
 * or on individual fields. `setErrorMap({ onServer: { form, fields } })`
 * distributes field errors into each field's `errorMap.onServer`, while
 * the form-level `errorMap.onServer` only holds the `form` property.
 * When the server returns only field-level errors (no `generalErrors`),
 * the form-level `onServer` is `undefined` but fields still have them.
 */
function hasServerErrors(formApi: AnyFormApi): boolean {
  if (
    (formApi.state.errorMap as Record<string, unknown>).onServer !== undefined
  )
    return true
  return Object.values(formApi.state.fieldMeta).some(
    (meta) =>
      (meta as { errorMap: Record<string, unknown> }).errorMap.onServer !==
      undefined,
  )
}

type UseSchemaFormOptions<TSchema extends z.ZodType> = {
  schema: TSchema
  defaultValues?: Partial<z.input<TSchema>>
  onSubmit: (value: z.output<TSchema>) => void | Promise<void>
  /** Called on every field change (after server errors are cleared). Useful for auto-save. */
  onValuesChange?: (formApi: AnyFormApi) => void
  /** Debounce interval (ms) for onValuesChange. Maps to TanStack Form's listeners.onChangeDebounceMs. */
  onChangeDebounceMs?: number
  /**
   * When true, blocks in-app navigation and browser tab close/refresh while the
   * form is dirty and no successful save has happened since the last edit.
   * Shows a Mantine confirmation modal asking the user to discard or stay.
   * If the onSubmit callback throws (e.g. API error), the guard stays active.
   */
  guardUnsavedChanges?: boolean
}

/**
 * Check whether a (possibly unwrapped) Zod type represents a string.
 * In Zod v4 `z.email()`, `z.url()`, `z.uuid()` etc. produce dedicated classes
 * (ZodEmail, ZodURL, …) that are NOT instances of ZodString, but their
 * internal def still has `type: "string"`.
 */
function isStringType(schema: z.ZodTypeAny): boolean {
  return (
    schema instanceof z.ZodString ||
    (schema as unknown as { _zod: { def: { type: string } } })._zod.def.type ===
      'string'
  )
}

/** Recursively unwrap Optional / Nullable / Default wrappers to reach the base type. */
function unwrap(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) {
    return unwrap(schema.unwrap() as z.ZodTypeAny)
  }
  if (schema instanceof z.ZodDefault) {
    return unwrap(schema.removeDefault() as z.ZodTypeAny)
  }
  return schema
}

/** Check whether the outermost wrapper is Optional or Nullable (i.e. undefined/null is valid). */
function isNullishField(schema: z.ZodTypeAny): boolean {
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable)
    return true
  if (schema instanceof z.ZodDefault)
    return isNullishField(schema.removeDefault() as z.ZodTypeAny)
  return false
}

/**
 * Given a ZodObject (or a schema wrapping one via .superRefine() etc.),
 * return the set of top-level keys that are nullish string fields.
 * These are fields where '' should be coerced to undefined before validation
 * so that controlled inputs (which use '' as empty) pass nullish schemas
 * like `z.string().min(1).nullish()`.
 */
function getNullishStringKeys(schema: z.ZodTypeAny): Set<string> {
  // Walk through ZodPipe wrappers (produced by .superRefine(), .transform(), etc.)
  let current = schema
  while (current instanceof z.ZodPipe) {
    current = (current as z.ZodPipe<z.ZodTypeAny, z.ZodTypeAny>)._zod.def.in
  }

  if (!(current instanceof z.ZodObject)) return new Set()

  const keys = new Set<string>()
  for (const [key, field] of Object.entries(current.shape)) {
    const base = unwrap(field)
    const isString =
      isStringType(base) ||
      (base instanceof z.ZodUnion &&
        (base.options as z.ZodTypeAny[]).some((opt) =>
          isStringType(unwrap(opt)),
        ))
    if (isString && isNullishField(field)) {
      keys.add(key)
    }
  }
  return keys
}

/**
 * Convert '' → undefined for all nullish string fields in a form value object.
 * This bridges the gap between controlled inputs (which need '' as the empty value)
 * and nullish Zod schemas (where '' fails validation but undefined passes).
 */
function coerceEmptyStrings<T>(value: T, nullishKeys: Set<string>): T {
  if (nullishKeys.size === 0 || typeof value !== 'object' || value === null)
    return value
  const result = { ...value } as Record<string, unknown>
  for (const key of nullishKeys) {
    if (result[key] === '') {
      result[key] = undefined
    }
  }
  return result as T
}

/**
 * Wrap a schema with a transform that coerces '' → undefined for nullish string
 * fields, then pipes into the original schema. The result is a proper Zod schema
 * (with Standard Schema support) so TanStack Form can map field-level errors.
 *
 * Non-nullish required strings (e.g. `z.string().min(1)`) are unaffected — ''
 * still correctly triggers their "required" error.
 */
function withEmptyStringCoercion<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
): z.ZodTypeAny {
  const nullishKeys = getNullishStringKeys(schema)
  if (nullishKeys.size === 0) return schema
  return z
    .any()
    .transform((val: unknown) => coerceEmptyStrings(val, nullishKeys))
    .pipe(schema)
}

/**
 * Derive empty defaults from a ZodObject schema so that every field starts
 * with a controlled value (no undefined for string inputs).
 *
 * Rules:
 *  - string base type  → ''      (keeps TextInput controlled)
 *  - boolean base type → false
 *  - everything else   → undefined (Mantine NumberInput / Select / FileInput handle this natively)
 */
function getEmptyDefaults(schema: z.ZodTypeAny): Record<string, unknown> {
  if (!(schema instanceof z.ZodObject)) return {}

  return Object.fromEntries(
    Object.entries(schema.shape as Record<string, z.ZodTypeAny>).map(
      ([key, field]) => {
        const base = unwrap(field)
        if (isStringType(base)) return [key, '']
        if (base instanceof z.ZodBoolean) return [key, false]
        if (base instanceof z.ZodObject) return [key, getEmptyDefaults(base)]
        // e.g. z.string().email().or(z.literal('')) produces a ZodUnion.
        // If any branch resolves to a string type, default to '' so the input stays controlled.
        if (
          base instanceof z.ZodUnion &&
          (base.options as z.ZodTypeAny[]).some((opt) =>
            isStringType(unwrap(opt)),
          )
        )
          return [key, '']
        return [key, undefined]
      },
    ),
  )
}

/**
 * Wrapper around useAppForm that uses a Zod schema as the single source of truth.
 * - defaultValues can be partial — string fields fall back to '' so inputs stay controlled
 * - validation is driven entirely by the schema (onChange + onSubmit)
 * - onSubmit receives the Zod-parsed output (guaranteed valid, transformations applied)
 *
 * ## Server error handling
 *
 * TanStack Form has no built-in way to map server validation errors from `onSubmit`.
 * The only official pattern is putting the API call inside `validators.onSubmitAsync`,
 * but that means running side-effects (create/update) inside a validator — semantically wrong.
 * See: https://github.com/TanStack/form/discussions/623
 *
 * Our workaround:
 * 1. The API call lives in `onSubmit` (where it belongs).
 * 2. On 400, we parse the response and call `formApi.setErrorMap()` (added in v1.11.0)
 *    with the `onServer` key and `{ form, fields }` shape to set both field-level
 *    and form-level errors in one call.
 * 3. A form-level `listeners.onChange` clears `onServer` errors when the user edits
 *    any field, which re-enables submission (solves the "can't resubmit" problem).
 * 4. `onSubmitInvalid` detects when `onServer` errors are the only thing blocking
 *    submission, clears them, and retries `handleSubmit()`. This lets the user click
 *    "Submit" twice without editing any fields (e.g. for transient server errors).
 * 5. The `as never` casts are required because `onServer` is typed as `undefined`
 *    when no server validator is declared — a known TypeScript gap in TanStack Form.
 */
export function useSchemaForm<TSchema extends z.ZodType>({
  schema,
  defaultValues,
  onSubmit,
  onValuesChange,
  onChangeDebounceMs,
  guardUnsavedChanges = false,
}: UseSchemaFormOptions<TSchema>) {
  // Captured at the top level of the hook so the strings are available inside
  // the (non-component) unsaved-changes modal callback below.
  const t = useFormKitLabels().unsavedChanges

  const emptyDefaults = getEmptyDefaults(schema)
  const coercedSchema = withEmptyStringCoercion(schema)

  // Merge caller-supplied defaults over empty defaults, but coerce null/undefined
  // back to the empty default so React inputs never receive null or undefined as a
  // value (which triggers "uncontrolled to controlled" and "value should not be null" warnings).
  const merged = { ...emptyDefaults, ...(defaultValues ?? {}) } as Record<
    string,
    unknown
  >
  for (const key of Object.keys(merged)) {
    if (
      (merged[key] === null || merged[key] === undefined) &&
      emptyDefaults[key] !== undefined
    ) {
      merged[key] = emptyDefaults[key]
    }
  }

  const form = useAppForm({
    defaultValues: merged as z.input<TSchema>,
    validators: {
      // Cast to a concrete `z.ZodType<output, input>` instantiation rather than
      // the generic `TSchema`. Since TanStack Form 1.33, validators are typed as
      // `RejectPromiseValidator<T>`, a conditional type TypeScript defers (and
      // then rejects) when `T` is an unresolved generic. Spelling out the
      // input/output (which mirror `TSchema`'s) makes the type concrete so the
      // conditional resolves, while keeping the same field/error typing.
      onChange: coercedSchema as z.ZodType<z.output<TSchema>, z.input<TSchema>>,
      // onSubmit intentionally omitted — onChange already runs on submit, and
      // having both validators fire simultaneously causes duplicate error messages.
      // schema.parse(value) in the onSubmit handler below is the actual safety net.
    },
    listeners: {
      onChange: ({ formApi }) => {
        // Clear stale server errors when the user edits any field so the form
        // becomes submittable again. Without this, `canSubmit` stays false
        // after a server error because the errorMap still contains truthy values.
        // See: https://github.com/TanStack/form/discussions/623#discussioncomment-13578233
        if (hasServerErrors(formApi)) {
          // Must use the { fields: {} } shape (not plain undefined) so that
          // setErrorMap takes the GlobalFormValidationError branch and clears
          // both the form-level AND all field-level onServer entries.
          formApi.setErrorMap({ onServer: { fields: {} } } as never)
        }
        // Reset isSubmitSuccessful when the user edits after a save so the
        // navigation guard re-arms for the save → edit → navigate flow.
        // Skip during the submit flow itself (TanStack Form fires onChange
        // internally during submission).
        if (formApi.state.isSubmitSuccessful && !formApi.state.isSubmitting) {
          formApi.baseStore.setState((prev) => ({
            ...prev,
            isSubmitSuccessful: false,
          }))
        }
        onValuesChange?.(formApi)
      },
      onChangeDebounceMs,
    },
    onSubmit: async ({ value, formApi }) => {
      const parsed = coercedSchema.parse(value)
      try {
        await onSubmit(parsed as z.output<TSchema>)
      } catch (error) {
        const serverErrors = parseServerErrors(error)
        if (!serverErrors) throw error

        // Promote field errors whose field has no visible DOM element to
        // form-level errors so the user always sees them. This handles
        // server-side validators that target internal/computed property
        // names with no corresponding <AppField> in the UI.
        const visibleFieldErrors: Record<string, string[]> = {}
        for (const [key, msgs] of Object.entries(serverErrors.fieldErrors)) {
          if (document.getElementById(key)) {
            visibleFieldErrors[key] = msgs
          } else {
            serverErrors.formErrors.push(...msgs)
          }
        }

        // Apply field-level and form-level errors in one call via setErrorMap (v1.11.0+).
        // Uses the GlobalFormValidationError shape: { form?, fields: {...} }
        // See: https://github.com/TanStack/form/discussions/623
        // The `as never` cast is needed because we don't declare an onServer validator,
        // so TypeScript types the onServer slot as `undefined`.
        formApi.setErrorMap({
          onServer: {
            form:
              serverErrors.formErrors.length > 0
                ? serverErrors.formErrors.join(' ')
                : undefined,
            fields: Object.fromEntries(
              Object.entries(visibleFieldErrors).map(([key, msgs]) => [
                key,
                msgs.join(' '),
              ]),
            ),
          },
        } as never)
      }
    },
    onSubmitInvalid: ({ formApi }) => {
      // Server errors (e.g. a transient 500 or a race condition) should not
      // permanently block resubmission. If the only reason canSubmit is false
      // is because of onServer errors, clear them and retry immediately.
      // This lets the user click "Submit" twice without editing: first attempt
      // gets server errors, second attempt retries the request.
      // See: https://github.com/TanStack/form/discussions/623#discussioncomment-13578233
      if (hasServerErrors(formApi)) {
        // Must use the { fields: {} } shape (not plain undefined) so that
        // setErrorMap takes the GlobalFormValidationError branch and clears
        // both the form-level AND all field-level onServer entries.
        formApi.setErrorMap({ onServer: { fields: {} } } as never)
        void formApi.handleSubmit()
        return
      }

      const firstErrorKey = Object.keys(formApi.state.fieldMeta).find(
        (key) =>
          (formApi.state.fieldMeta[key as keyof typeof formApi.state.fieldMeta]
            ?.errors.length ?? 0) > 0,
      )
      if (firstErrorKey) {
        const el = document.getElementById(firstErrorKey)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else if (isDevMode()) {
          // Field has errors but no DOM element — likely a schema field with no
          // corresponding <AppField> in the UI. Warn the developer so they can
          // either add the field or .omit() it from the schema.
          const orphanFields = Object.entries(formApi.state.fieldMeta)
            .filter(
              ([key, meta]) =>
                (
                  meta as {
                    errors: unknown[]
                  }
                ).errors.length > 0 && !document.getElementById(key),
            )
            .map(([key]) => key)
          if (orphanFields.length > 0) {
            console.warn(
              `[useSchemaForm] Validation errors exist for fields that have no corresponding DOM element: ${orphanFields.join(', ')}. ` +
                `Either add <form.AppField name="..."> for these fields, or remove them from the schema with .omit().`,
            )
          }
        }
      }
    },
  })

  // ── Navigation guard ─────────────────────────────────────────────────────
  // isDirty: true when form values differ from defaultValues
  // isSubmitSuccessful: true after a successful submit, reset to false at
  //   the start of the next handleSubmit() call
  // Block navigation when the form is dirty AND hasn't been successfully saved.
  const isDirty = useSelector(form.store, (s) => s.isDirty)
  const isSubmitSuccessful = useSelector(
    form.store,
    (s) => s.isSubmitSuccessful,
  )

  const hasUnsavedChanges =
    guardUnsavedChanges && isDirty && !isSubmitSuccessful

  const blocker = useBlocker({
    shouldBlockFn: () => hasUnsavedChanges,
    enableBeforeUnload: () => hasUnsavedChanges,
    withResolver: true,
    disabled: !guardUnsavedChanges,
  })

  useEffect(() => {
    if (blocker.status === 'blocked') {
      modals.openConfirmModal({
        title: t.title,
        children: t.message,
        labels: { confirm: t.discardButton, cancel: t.stayButton },
        confirmProps: { color: 'red' },
        onConfirm: () => blocker.proceed(),
        onCancel: () => blocker.reset(),
      })
    }
  }, [blocker, t])

  return Object.assign(form, { hasUnsavedChanges })
}
