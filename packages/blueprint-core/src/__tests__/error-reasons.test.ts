import { describe, expect, it } from 'vitest'
import { collectErrorReasons } from '../error-reasons'

describe('collectErrorReasons', () => {
  it('reads the FastEndpoints array, which carries the reasons when detail is omitted', () => {
    // A refusal with two reasons: FastEndpoints sends no `detail` at all, so without these the
    // user is left with "Bad Request".
    const problem = {
      title: 'Bad Request',
      status: 400,
      errors: [
        {
          name: 'generalErrors',
          reason: 'Cannot delete pedalo with existing reservations.',
        },
        {
          name: 'generalErrors',
          reason: 'Cannot delete pedalo with existing maintenance records.',
        },
      ],
    }

    expect(collectErrorReasons(problem)).toEqual([
      'Cannot delete pedalo with existing reservations.',
      'Cannot delete pedalo with existing maintenance records.',
    ])
  })

  it('keeps field reasons as well as general ones, without the field names', () => {
    const problem = {
      status: 400,
      errors: [
        { name: 'Name', reason: 'Name is required.' },
        { name: 'generalErrors', reason: 'The fleet is full.' },
      ],
    }

    expect(collectErrorReasons(problem)).toEqual([
      'Name is required.',
      'The fleet is full.',
    ])
  })

  it('drops repeated reasons, keeping the first occurrence in order', () => {
    const problem = {
      status: 400,
      errors: [
        { name: 'generalErrors', reason: 'Already reserved.' },
        { name: 'Start', reason: 'Starts in the past.' },
        { name: 'generalErrors', reason: ' Already reserved. ' },
      ],
    }

    expect(collectErrorReasons(problem)).toEqual([
      'Already reserved.',
      'Starts in the past.',
    ])
  })

  it('reads the RFC 9457 dictionary form that ASP.NET Core validation sends', () => {
    const problem = {
      title: 'One or more validation errors occurred.',
      status: 400,
      errors: {
        Email: ['Email is required.', 'Email is not a valid address.'],
        Password: ['Password is too short.'],
      },
    }

    expect(collectErrorReasons(problem)).toEqual([
      'Email is required.',
      'Email is not a valid address.',
      'Password is too short.',
    ])
  })

  it('accepts plain strings in either shape and skips anything that is not text', () => {
    expect(
      collectErrorReasons({
        status: 400,
        errors: ['First.', { name: 'x' }, { reason: 42 }, null, ''],
      }),
    ).toEqual(['First.'])

    expect(
      collectErrorReasons({
        status: 400,
        errors: { Name: 'Name is required.', Other: [null, 3] },
      }),
    ).toEqual(['Name is required.'])
  })

  it('returns nothing when there is no errors member to read', () => {
    expect(collectErrorReasons({ status: 500, title: 'Boom' })).toEqual([])
    expect(collectErrorReasons({ status: 400, errors: null })).toEqual([])
    expect(collectErrorReasons(undefined)).toEqual([])
    expect(collectErrorReasons('Bad Request')).toEqual([])
  })
})
