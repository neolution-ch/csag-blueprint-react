import { AxiosError, AxiosHeaders } from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  defaultErrorNotificationLabels as labels,
  describeErrorNotification,
} from '../error-notification-content'

const traceId = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'

// The body FastEndpoints sent when deleting a pedalo that still had history. With two errors it
// omits `detail`, so the reasons live only in `errors`.
const deletePedaloRefusal = {
  type: 'https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1',
  title: 'Bad Request',
  status: 400,
  instance: '/api/pedalos/7',
  traceId,
  errors: [
    {
      name: 'generalErrors',
      reason:
        'Cannot delete pedalo with existing reservations. Set Status to Retired instead to preserve historical data.',
    },
    {
      name: 'generalErrors',
      reason:
        'Cannot delete pedalo with existing maintenance records. Set Status to Retired instead.',
    },
  ],
}

function axiosError(response?: { status: number; data: unknown }): AxiosError {
  const config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() }
  return new AxiosError(
    response
      ? `Request failed with status code ${response.status}`
      : 'Network Error',
    response ? 'ERR_BAD_RESPONSE' : 'ERR_NETWORK',
    config,
    {},
    response && {
      ...response,
      statusText: '',
      headers: {},
      config,
    },
  )
}

describe('describeErrorNotification — title', () => {
  it.each([400, 403, 404, 409, 422])(
    'titles a %i as a refused request, not a failure',
    (status) => {
      const content = describeErrorNotification(
        { status, title: 'Refused', detail: 'Not allowed.' },
        labels,
      )

      expect(content.title).toBe('Could not complete the request')
    },
  )

  it.each([500, 502, 503])('keeps the failure title for a %i', (status) => {
    const content = describeErrorNotification(
      { status, title: 'An error occurred while processing your request.' },
      labels,
    )

    expect(content.title).toBe('Something went wrong')
  })

  it('keeps the failure title when no response came back', () => {
    expect(describeErrorNotification(axiosError(), labels).title).toBe(
      'Something went wrong',
    )
  })

  it('keeps the failure title for an error with no HTTP status at all', () => {
    expect(
      describeErrorNotification(new Error('render failed'), labels).title,
    ).toBe('Something went wrong')
  })

  it('uses the titles the app supplied', () => {
    const custom = {
      ...labels,
      title: 'Etwas ist schiefgelaufen',
      rejectedTitle: 'Nicht möglich',
    }

    expect(
      describeErrorNotification({ status: 409, title: 'Conflict' }, custom)
        .title,
    ).toBe('Nicht möglich')
    expect(
      describeErrorNotification({ status: 500, title: 'Error' }, custom).title,
    ).toBe('Etwas ist schiefgelaufen')
  })
})

describe('describeErrorNotification — message', () => {
  it('prefers the detail when the server sent one', () => {
    const content = describeErrorNotification(
      {
        status: 400,
        title: 'Bad Request',
        detail: 'Pedalo is already reserved for the selected time period',
        errors: [
          {
            name: 'generalErrors',
            reason: 'Pedalo is already reserved for the selected time period',
          },
        ],
      },
      labels,
    )

    expect(content.message).toBe(
      'Pedalo is already reserved for the selected time period',
    )
  })

  it('falls back to every reason, one per line, when there is no detail', () => {
    const content = describeErrorNotification(deletePedaloRefusal, labels)

    expect(content.title).toBe('Could not complete the request')
    expect(content.message).toBe(
      [
        'Cannot delete pedalo with existing reservations. Set Status to Retired instead to preserve historical data.',
        'Cannot delete pedalo with existing maintenance records. Set Status to Retired instead.',
        `Trace ID: ${traceId}`,
      ].join('\n'),
    )
  })

  it('lists a repeated reason once', () => {
    const reason = 'Pedalo is already reserved for the selected time period'
    const content = describeErrorNotification(
      {
        status: 400,
        title: 'Bad Request',
        errors: [
          { name: 'generalErrors', reason },
          { name: 'generalErrors', reason },
        ],
      },
      labels,
    )

    expect(content.message).toBe(reason)
  })

  it('reads the reasons from the RFC 9457 dictionary form too', () => {
    const content = describeErrorNotification(
      {
        status: 400,
        title: 'One or more validation errors occurred.',
        errors: { Name: ['Name is required.'], Capacity: ['Too small.'] },
      },
      labels,
    )

    expect(content.message).toBe('Name is required.\nToo small.')
  })

  it('treats an empty detail as missing', () => {
    const content = describeErrorNotification(
      {
        status: 400,
        title: 'Bad Request',
        detail: '',
        errors: [{ name: 'generalErrors', reason: 'Invalid code.' }],
      },
      labels,
    )

    expect(content.message).toBe('Invalid code.')
  })

  it('falls back to the title when there is neither detail nor errors', () => {
    const content = describeErrorNotification(
      { status: 404, title: 'Not Found' },
      labels,
    )

    expect(content.message).toBe('Not Found')
  })

  it('reads the body of an axios error rather than the axios error itself', () => {
    const content = describeErrorNotification(
      axiosError({ status: 400, data: deletePedaloRefusal }),
      labels,
    )

    expect(content.title).toBe('Could not complete the request')
    expect(content.message).toContain(
      'Cannot delete pedalo with existing maintenance records.',
    )
  })

  it('never shows client-side text for a request that got no response', () => {
    const content = describeErrorNotification(axiosError(), labels)

    expect(content.message).toBe('Please try again.')
  })
})

describe('describeErrorNotification — clipboard', () => {
  it('carries the reasons the server gave', () => {
    const content = describeErrorNotification(deletePedaloRefusal, labels)

    expect(content.clipboardText).toBe(
      [
        'Title: Bad Request',
        'Status: 400',
        'Errors:',
        '- Cannot delete pedalo with existing reservations. Set Status to Retired instead to preserve historical data.',
        '- Cannot delete pedalo with existing maintenance records. Set Status to Retired instead.',
        `Trace ID: ${traceId}`,
      ].join('\n'),
    )
  })

  it('does not repeat a reason that is already the detail', () => {
    const reason = 'Invalid code.'
    const content = describeErrorNotification(
      {
        status: 400,
        title: 'Bad Request',
        detail: reason,
        errors: [{ name: 'generalErrors', reason }],
      },
      labels,
    )

    expect(content.clipboardText).toBe(
      'Title: Bad Request\nStatus: 400\nDetail: Invalid code.',
    )
  })

  it('offers nothing to copy for an error that is not a problem', () => {
    expect(
      describeErrorNotification(new Error('boom'), labels).clipboardText,
    ).toBeUndefined()
  })
})
