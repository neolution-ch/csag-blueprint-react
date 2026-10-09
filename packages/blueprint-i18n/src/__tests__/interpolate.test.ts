import { describe, expect, it } from 'vitest'
import { formatMessage, interpolate } from '../interpolate'

describe('formatMessage', () => {
  it('substitutes single-brace placeholders', () => {
    expect(
      formatMessage('{FieldName} must be at least {Min} characters', {
        FieldName: 'Password',
        Min: 8,
      }),
    ).toBe('Password must be at least 8 characters')
  })

  it('substitutes every occurrence of the same placeholder', () => {
    expect(formatMessage('{X} and {X}', { X: 'a' })).toBe('a and a')
  })

  // A missing value has to stay visible as a placeholder. Rendering the string "undefined"
  // into the UI hides the fact that a translation argument was never supplied.
  it('leaves a placeholder with no matching value alone', () => {
    expect(formatMessage('{Known} then {Unknown}', { Known: 'x' })).toBe(
      'x then {Unknown}',
    )
  })

  it('returns the template unchanged when there are no values', () => {
    expect(formatMessage('nothing to fill', {})).toBe('nothing to fill')
  })

  it('coerces numbers', () => {
    expect(formatMessage('{Count}', { Count: 0 })).toBe('0')
  })

  // Mirror of the interpolate case below: a string still in the deprecated syntax comes back
  // untouched rather than as `{world}`.
  it('leaves double-brace placeholders alone', () => {
    expect(formatMessage('Hello {{name}}', { name: 'world' })).toBe(
      'Hello {{name}}',
    )
  })

  it('does not fill placeholders that arrive inside a value', () => {
    expect(formatMessage('{A} and {B}', { A: '{B}', B: 'b' })).toBe('{B} and b')
  })

  it('inserts replacement-pattern sequences verbatim', () => {
    expect(formatMessage('Total: {Amount}', { Amount: "$& $' $$" })).toBe(
      "Total: $& $' $$",
    )
  })

  it('ignores inherited properties of the values object', () => {
    expect(formatMessage('{toString}', {})).toBe('{toString}')
  })
})

describe('interpolate', () => {
  it('still substitutes double-brace placeholders', () => {
    expect(interpolate('Hello {{name}}', { name: 'world' })).toBe('Hello world')
  })

  // The two syntaxes must not collide: the backend emits single braces, so a string passed
  // to the deprecated helper has to come back untouched rather than half-filled.
  it('ignores single-brace placeholders', () => {
    expect(interpolate('Hello {name}', { name: 'world' })).toBe('Hello {name}')
  })
})
