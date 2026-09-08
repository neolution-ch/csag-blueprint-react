import { describe, it, expect } from 'vitest'
import { translationKeysToDebugObject } from '../translationKeysToDebugObject'

describe('translationKeysToDebugObject', () => {
  it('replaces leaf string values with PascalCase dotted key paths', () => {
    const input = {
      auth: {
        login: {
          brandName: 'CSAG Blueprint',
          emailLabel: 'Email',
        },
      },
    }
    const result = translationKeysToDebugObject(input)
    expect(result.auth.login.brandName).toBe('Auth.Login.BrandName')
    expect(result.auth.login.emailLabel).toBe('Auth.Login.EmailLabel')
  })

  it('handles a flat object with no nesting', () => {
    const input = { cancel: 'Cancel', save: 'Save' }
    const result = translationKeysToDebugObject(input)
    expect(result.cancel).toBe('Cancel')
    expect(result.save).toBe('Save')
  })

  it('handles deeply nested structures', () => {
    const input = {
      settings: {
        language: {
          title: 'Language',
          successMessage: 'Updated',
        },
      },
    }
    const result = translationKeysToDebugObject(input)
    expect(result.settings.language.title).toBe('Settings.Language.Title')
    expect(result.settings.language.successMessage).toBe(
      'Settings.Language.SuccessMessage',
    )
  })

  it('replaces null and undefined values with their key path', () => {
    const input = {
      common: {
        missing: null as string | null,
        alsoMissing: undefined as string | undefined,
      },
    }
    const result = translationKeysToDebugObject(input)
    expect(result.common.missing).toBe('Common.Missing')
    expect(result.common.alsoMissing).toBe('Common.AlsoMissing')
  })

  it('preserves the original object shape (same keys)', () => {
    const input = {
      validation: { emailRequired: 'Email is required' },
      errors: { pedaloNotFound: 'Pedalo not found' },
    }
    const result = translationKeysToDebugObject(input)
    expect(Object.keys(result)).toEqual(['validation', 'errors'])
    expect(Object.keys(result.validation)).toEqual(['emailRequired'])
    expect(Object.keys(result.errors)).toEqual(['pedaloNotFound'])
  })

  it('handles an empty object', () => {
    const result = translationKeysToDebugObject({})
    expect(result).toEqual({})
  })

  it('handles mixed nesting (strings alongside nested objects)', () => {
    const input = {
      auth: {
        loginSuccessful: 'Login successful',
        login: {
          brandName: 'CSAG Blueprint',
        },
      },
    }
    const result = translationKeysToDebugObject(input)
    expect(result.auth.loginSuccessful).toBe('Auth.LoginSuccessful')
    expect(result.auth.login.brandName).toBe('Auth.Login.BrandName')
  })
})
