import { describe, expect, it } from 'vitest'
import { parseServerErrors } from '../parse-server-errors'

/**
 * The form kit maps any 4xx carrying the FastEndpoints `errors` array onto the form — not just 400.
 * Endpoints send AddError-driven refusals as 409 ("already a member", "account disabled", "an account
 * with this email already exists") or 404 with the same body, and forms that own their error display
 * suppress the global toast — so an unmapped refusal produced no feedback at all: no toast, no banner,
 * no field error, just a spinner that stops. That silent-swallow regression is pinned here.
 */
describe('parseServerErrors', () => {
  const problemDetails = (
    status: number,
    errors?: { name: string; reason: string }[],
  ) => ({
    status,
    type: 'https://tools.ietf.org/html/rfc9110',
    title: 'One or more errors occurred.',
    ...(errors === undefined ? {} : { errors }),
  })

  it('maps a 400 validation failure onto fields', () => {
    const parsed = parseServerErrors(
      problemDetails(400, [{ name: 'Email', reason: 'Invalid email.' }]),
    )

    expect(parsed).toEqual({
      fieldErrors: { email: ['Invalid email.'] },
      formErrors: [],
    })
  })

  it('maps a 409 refusal onto fields instead of swallowing it', () => {
    // The platform invite form's mainstream failure: the typed address already has a claimed account.
    const parsed = parseServerErrors(
      problemDetails(409, [
        {
          name: 'Email',
          reason: 'An account with this email already exists.',
        },
      ]),
    )

    expect(parsed).toEqual({
      fieldErrors: { email: ['An account with this email already exists.'] },
      formErrors: [],
    })
  })

  it('maps an AddError-driven 404 onto fields', () => {
    const parsed = parseServerErrors(
      problemDetails(404, [
        { name: 'TenantId', reason: 'That tenant does not exist.' },
      ]),
    )

    expect(parsed).toEqual({
      fieldErrors: { tenantId: ['That tenant does not exist.'] },
      formErrors: [],
    })
  })

  it('routes generalErrors entries to the form-level banner', () => {
    const parsed = parseServerErrors(
      problemDetails(409, [
        { name: 'generalErrors', reason: 'This cannot be done right now.' },
      ]),
    )

    expect(parsed).toEqual({
      fieldErrors: {},
      formErrors: ['This cannot be done right now.'],
    })
  })

  it('returns null for a 5xx so it reaches the global handler', () => {
    expect(parseServerErrors(problemDetails(500))).toBeNull()
  })

  it('returns null for a 4xx without the errors array (e.g. a bare NotFound)', () => {
    expect(parseServerErrors(problemDetails(404))).toBeNull()
  })

  it('returns null for a network failure that is not a problem-details shape', () => {
    expect(parseServerErrors(new Error('Network Error'))).toBeNull()
  })
})
