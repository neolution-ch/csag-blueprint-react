import { z } from 'zod'
import type { ZodFieldNames, ZodValidationMessages } from './messages'

/**
 * Global Zod error map that turns Zod's terse defaults ("Invalid input", "Too
 * small: …") into the app's own localized validation messages.
 *
 * All real forms validate against Orval-generated schemas (e.g. `CreatePedaloBody`)
 * whose `.min()` / `.max()` / `z.enum()` calls carry no messages, so without this
 * they fall back to Zod's built-in text. The backend already defines a full,
 * localized validation vocabulary in `TranslationDefaults.Validation` (delivered to
 * the client via `useT().validation` + `useT().fields`); this map reuses it so the
 * client messages match the server-side FluentValidation messages in every language.
 *
 * ## Wiring
 * `main.tsx` imports this module for its side effect (`z.config({ customError })`),
 * mirroring `zod-patch.ts`. `z.config` is a module-level singleton while translations
 * live in React context, so the root component (`__root.tsx`) bridges the two by
 * calling `setZodValidationMessages` / `setZodValidationLocale` whenever the resolved
 * translations or language change. `customError` reads the holder lazily at parse
 * time, so configuring it before translations load is fine (it falls through to the
 * Zod locale until then).
 *
 * Codes we don't map explicitly (invalid_format, not_multiple_of, custom, union, …)
 * return `undefined` and fall through to the built-in Zod locale set as `localeError`,
 * so they stay translated rather than reverting to English defaults.
 */

// Bridge between the React translation context and Zod's global (module-level) config.
let messages: ZodValidationMessages | null = null
let fieldNames: ZodFieldNames | null = null

/**
 * Publish the current language's validation strings + field names to the global
 * error map. Pass `null` to clear (e.g. before translations have loaded).
 */
export function setZodValidationMessages(
  next: ZodValidationMessages | null,
  fields?: ZodFieldNames | null,
): void {
  messages = next
  fieldNames = fields ?? null
}

const zodLocaleFactories: Record<
  string,
  () => { localeError: z.core.$ZodErrorMap }
> = {
  de: z.locales.de,
  en: z.locales.en,
  fr: z.locales.fr,
  it: z.locales.it,
}

/**
 * Apply the built-in Zod locale matching the app language as the fallback layer
 * (used for any issue code `customError` doesn't handle). Regional codes are mapped
 * by their base language, e.g. `de-CH` → `de`, `en-GB` → `en`.
 */
export function setZodValidationLocale(languageCode: string): void {
  const base = languageCode.slice(0, 2).toLowerCase()
  const factory = zodLocaleFactories[base] ?? z.locales.en
  z.config({ localeError: factory().localeError })
}

/** Turn "hourlyRate" / "registration_number" into "Hourly rate" / "Registration number". */
function humanize(key: string): string {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * Resolve a human field name for the issue's target field. Prefers the localized
 * label from the `fields` namespace (keyed by the same camelCase name as the schema
 * property, e.g. `hourlyRate`), falling back to a humanized path segment. Returns
 * null when there is no usable field name (top-level issues, array indices) — the
 * caller then falls through to the Zod locale rather than emitting " is required".
 */
function resolveFieldName(path: PropertyKey[] | undefined): string | null {
  if (!path || path.length === 0) return null
  const segment = path[path.length - 1]
  if (typeof segment !== 'string' || segment.length === 0) return null
  const localized = fieldNames
    ? (fieldNames as unknown as Record<string, string | undefined>)[segment]
    : undefined
  return localized ?? humanize(segment)
}

/** Replace single-brace `{Key}` placeholders (the style used by the backend templates). */
function fill(
  template: string,
  values: Record<string, string | number>,
): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

const customError: z.core.$ZodErrorMap = (issue) => {
  // No translations yet (or failed to load): let the Zod locale/default handle it.
  if (!messages) return undefined

  const fieldName = resolveFieldName(issue.path)
  if (!fieldName) return undefined

  const build = (template: string, extra?: Record<string, string | number>) =>
    fill(template, { FieldName: fieldName, ...extra })

  switch (issue.code) {
    case 'invalid_type': {
      // Empty inputs surface as undefined/null/'' — treat as "required" rather
      // than "invalid", matching how the field actually failed for the user.
      const input = issue.input
      const isMissing = input === undefined || input === null || input === ''
      return isMissing
        ? build(messages.fieldRequired)
        : build(messages.invalidValue)
    }
    case 'too_small': {
      const min = String(issue.minimum)
      if (issue.origin === 'string') {
        // A required text field is `.min(1)`; anything larger is a real length rule.
        return Number(issue.minimum) <= 1
          ? build(messages.fieldRequired)
          : build(messages.minLength, { Min: min })
      }
      if (issue.origin === 'array' || issue.origin === 'set') {
        return build(messages.collectionRequired)
      }
      // number / int / bigint / date
      return issue.inclusive
        ? build(messages.greaterThanOrEqual, { Min: min })
        : build(messages.greaterThan, { Min: min })
    }
    case 'too_big': {
      const max = String(issue.maximum)
      return issue.origin === 'string'
        ? build(messages.maxLength, { Max: max })
        : build(messages.maxValue, { Max: max })
    }
    case 'invalid_value': {
      // e.g. a z.enum() receiving a value outside the allowed set.
      return build(messages.invalidValue)
    }
    default:
      return undefined
  }
}

/**
 * Register the error map on Zod's global config. Call once during app start-up, before any
 * generated schema is parsed.
 *
 * `z.config` merges, so a later `setZodValidationLocale` adds `localeError` without
 * clearing this `customError`. Defaults to the English locale until the app language is known.
 */
export function installZodErrorMap(): void {
  z.config({ customError, localeError: z.locales.en().localeError })
}
