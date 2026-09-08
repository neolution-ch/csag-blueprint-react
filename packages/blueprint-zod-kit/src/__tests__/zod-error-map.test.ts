import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  setZodValidationLocale,
  setZodValidationMessages,
} from '#/zod-error-map'
import type { TranslationValues } from '#/generated/model'

// Minimal stand-in for the parts of TranslationValues the error map reads. Values
// mirror the real English templates from TranslationDefaults.Validation / .Fields.
const translations = {
  validation: {
    fieldRequired: '{FieldName} is required',
    minLength: '{FieldName} must be at least {Min} characters',
    maxLength: '{FieldName} must not exceed {Max} characters',
    greaterThan: '{FieldName} must be greater than {Min}',
    greaterThanOrEqual: '{FieldName} must be greater than or equal to {Min}',
    maxValue: '{FieldName} must not exceed {Max}',
    rangeValue: '{FieldName} must be between {Min} and {Max}',
    invalidValue: 'Invalid {FieldName}',
    collectionRequired: '{FieldName} collection is required',
  },
  fields: {
    name: 'Name',
    capacity: 'Capacity',
    hourlyRate: 'Hourly rate',
    registrationNumber: 'Registration number',
    columns: 'Columns',
  },
} as unknown as TranslationValues

/** Parse `input` against `schema` and return the first issue's message. */
function firstMessage(schema: z.ZodType, input: unknown): string {
  const result = schema.safeParse(input)
  expect(result.success).toBe(false)
  return result.error!.issues[0].message
}

describe('zod-error-map', () => {
  beforeEach(() => {
    setZodValidationMessages(translations)
    setZodValidationLocale('en-GB')
  })

  afterAll(() => {
    // Don't leak the seeded messages into other suites sharing the module.
    setZodValidationMessages(null)
  })

  it('maps an empty required string to "<Field> is required"', () => {
    const schema = z.object({ name: z.string().min(1).max(100) })
    expect(firstMessage(schema, { name: '' })).toBe('Name is required')
  })

  it('maps a missing required number to "<Field> is required"', () => {
    const schema = z.object({ capacity: z.number().gt(0) })
    expect(firstMessage(schema, {})).toBe('Capacity is required')
  })

  it('maps a string over max length to "<Field> must not exceed <Max> characters"', () => {
    const schema = z.object({ name: z.string().min(1).max(100) })
    expect(firstMessage(schema, { name: 'a'.repeat(101) })).toBe(
      'Name must not exceed 100 characters',
    )
  })

  it('maps a string under a real min length to "<Field> must be at least <Min> characters"', () => {
    const schema = z.object({ name: z.string().min(3) })
    expect(firstMessage(schema, { name: 'ab' })).toBe(
      'Name must be at least 3 characters',
    )
  })

  it('maps an exclusive numeric minimum (gt) to "must be greater than"', () => {
    const schema = z.object({ hourlyRate: z.number().gt(0).max(10000) })
    expect(firstMessage(schema, { hourlyRate: -5 })).toBe(
      'Hourly rate must be greater than 0',
    )
  })

  it('maps an inclusive numeric minimum (gte) to "must be greater than or equal to"', () => {
    const schema = z.object({ capacity: z.number().gte(2) })
    expect(firstMessage(schema, { capacity: 1 })).toBe(
      'Capacity must be greater than or equal to 2',
    )
  })

  it('maps a numeric maximum to "<Field> must not exceed <Max>"', () => {
    const schema = z.object({ hourlyRate: z.number().gt(0).max(10000) })
    expect(firstMessage(schema, { hourlyRate: 20000 })).toBe(
      'Hourly rate must not exceed 10000',
    )
  })

  it('maps an invalid enum value to "Invalid <Field>"', () => {
    const schema = z.object({ capacity: z.enum(['a', 'b']) })
    expect(firstMessage(schema, { capacity: 'c' })).toBe('Invalid Capacity')
  })

  it('maps an empty array under min to "<Field> collection is required"', () => {
    const schema = z.object({ columns: z.array(z.string()).min(1) })
    expect(firstMessage(schema, { columns: [] })).toBe(
      'Columns collection is required',
    )
  })

  it('uses the localized field label from the fields namespace', () => {
    const schema = z.object({ hourlyRate: z.string().min(1) })
    expect(firstMessage(schema, { hourlyRate: '' })).toBe(
      'Hourly rate is required',
    )
  })

  it('humanizes the path segment when there is no fields entry', () => {
    const schema = z.object({ someCustomField: z.string().min(1) })
    expect(firstMessage(schema, { someCustomField: '' })).toBe(
      'Some custom field is required',
    )
  })

  it('falls through to the Zod default when no translations are loaded', () => {
    setZodValidationMessages(null)
    const schema = z.object({ name: z.string().min(1) })
    const message = firstMessage(schema, { name: '' })
    // Not our template — the built-in Zod locale message is used instead.
    expect(message).not.toBe('Name is required')
    expect(message.length).toBeGreaterThan(0)
  })
})
