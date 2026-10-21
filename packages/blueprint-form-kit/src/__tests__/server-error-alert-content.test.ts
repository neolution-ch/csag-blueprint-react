import { FormApi } from '@tanstack/react-form'
import { describe, expect, it } from 'vitest'
import { defaultFormKitLabels, mergeLabels } from '../labels'
import { getServerErrorAlertContent } from '../server-error-alert-content'

const labels = defaultFormKitLabels

describe('getServerErrorAlertContent — title', () => {
  it('titles what useSchemaForm maps (a bare string) as a refused request', () => {
    // useSchemaForm only maps 4xx bodies, and TanStack Form reduces its { form, fields } write
    // to the string, so the status is gone by the time the banner reads it.
    expect(
      getServerErrorAlertContent(
        'Pedalo is already reserved for the selected time period',
        labels,
      ),
    ).toEqual({
      title: 'Could not complete the request',
      messages: ['Pedalo is already reserved for the selected time period'],
    })
  })

  it.each([400, 401, 404, 409])(
    'titles a caught %i as a refused request',
    (status) => {
      expect(
        getServerErrorAlertContent(
          { form: 'Invalid email or password', status },
          labels,
        )?.title,
      ).toBe('Could not complete the request')
    },
  )

  it.each([500, 503, 0])('titles a caught %i as a server error', (status) => {
    expect(
      getServerErrorAlertContent(
        { form: 'The service is unavailable.', status },
        labels,
      )?.title,
    ).toBe('Server error')
  })

  it('titles a caught error without a status as a refused request', () => {
    expect(
      getServerErrorAlertContent({ form: 'Invalid code.' }, labels)?.title,
    ).toBe('Could not complete the request')
  })

  it('uses the titles the app supplied', () => {
    const custom = mergeLabels({
      serverError: 'Serverfehler',
      requestRejected: 'Nicht möglich',
    })

    expect(
      getServerErrorAlertContent('Bereits reserviert.', custom)?.title,
    ).toBe('Nicht möglich')
    expect(
      getServerErrorAlertContent({ form: 'Boom.', status: 500 }, custom)?.title,
    ).toBe('Serverfehler')
  })

  it('falls back to the English refusal title for an app that has not supplied one', () => {
    const merged = mergeLabels({ serverError: 'Serverfehler' })

    expect(
      getServerErrorAlertContent('Bereits reserviert.', merged)?.title,
    ).toBe('Could not complete the request')
  })
})

describe('getServerErrorAlertContent — messages', () => {
  it('keeps every message of an array', () => {
    expect(
      getServerErrorAlertContent(['First.', '', 'Second.'], labels)?.messages,
    ).toEqual(['First.', 'Second.'])
  })

  it('shows nothing when there is no message', () => {
    expect(getServerErrorAlertContent(undefined, labels)).toBeUndefined()
    expect(getServerErrorAlertContent('', labels)).toBeUndefined()
    expect(getServerErrorAlertContent([], labels)).toBeUndefined()
    expect(
      getServerErrorAlertContent({ form: undefined, status: 500 }, labels),
    ).toBeUndefined()
  })
})

// The shapes above are what TanStack Form actually leaves in the slot. Pinned against the real
// FormApi, because the documented `{ form, status }` write only works while an object without
// `fields` is stored whole.
describe('form-level onServer slot', () => {
  function formWith(onServer: unknown) {
    const form = new FormApi({ defaultValues: { name: '' } })
    form.mount()
    form.setErrorMap({ onServer } as never)
    return form.state.errorMap.onServer as unknown
  }

  it('keeps the status of an object written without fields', () => {
    expect(
      getServerErrorAlertContent(
        formWith({ form: 'The service is unavailable.', status: 503 }),
        labels,
      ),
    ).toEqual({
      title: 'Server error',
      messages: ['The service is unavailable.'],
    })
  })

  it('keeps only the message of an object written with fields', () => {
    expect(
      formWith({ form: 'Already reserved.', status: 503, fields: {} }),
    ).toBe('Already reserved.')
  })

  it('is empty again after the clear useSchemaForm performs', () => {
    const form = new FormApi({ defaultValues: { name: '' } })
    form.mount()
    form.setErrorMap({ onServer: { form: 'Boom.', status: 500 } } as never)
    form.setErrorMap({ onServer: { fields: {} } } as never)

    expect(
      getServerErrorAlertContent(form.state.errorMap.onServer, labels),
    ).toBeUndefined()
  })
})
