// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import 'dayjs/locale/de-ch'
import { MantineProvider } from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import { StrictMode } from 'react'
import type { ReactNode } from 'react'
import { useAppForm } from '../../useAppForm'
import { setDevMode } from '../../dev-mode'

// jsdom has no matchMedia; MantineProvider reads it for the colour scheme.
window.matchMedia = (query: string) =>
    ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
    }) as MediaQueryList

type FieldName = 'DateInput' | 'DateTimeInput' | 'TimeInput'

interface FormHandle {
    reset: () => void
    setFieldValue: (name: 'value', value: string | null) => void
    getFieldMeta: (name: 'value') => { isBlurred: boolean } | undefined
}

function renderField(
    kind: FieldName,
    initial: string | null,
    options: {
        locale?: string
        props?: Record<string, unknown>
        strict?: boolean
    } = {},
) {
    const state: { value?: string | null; form?: FormHandle } = {}

    function Harness() {
        const form = useAppForm({
            defaultValues: { value: initial },
            listeners: {
                onChange: ({ formApi }) => {
                    state.value = formApi.state.values.value
                },
            },
        })
        state.form = form
        return (
            <form.AppField name="value">
                {(field) => {
                    const Field = field[kind] as (props: {
                        label: string
                    }) => ReactNode
                    return <Field label="Field" {...options.props} />
                }}
            </form.AppField>
        )
    }

    const tree = options.strict ? (
        <StrictMode>
            <Harness />
        </StrictMode>
    ) : (
        <Harness />
    )
    const view = render(
        <MantineProvider env="test">
            {options.locale ? (
                <DatesProvider settings={{ locale: options.locale }}>
                    {tree}
                </DatesProvider>
            ) : (
                tree
            )}
        </MantineProvider>,
    )
    return {
        view,
        emitted: () => state.value,
        // Changes made through the form API, not by typing into the field.
        fromOutside: (change: (form: FormHandle) => void) => {
            act(() => change(state.form!))
        },
    }
}

afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    setDevMode(undefined)
})

describe('DateInputField', () => {
    it('shows and parses the DatesProvider locale format', () => {
        const { emitted } = renderField('DateInput', '2026-10-26', {
            locale: 'de-CH',
        })
        const input = screen.getByLabelText<HTMLInputElement>('Field')
        expect(input.value).toBe('26.10.2026')

        fireEvent.change(input, { target: { value: '25.10.2026' } })
        expect(emitted()).toBe('2026-10-25')
    })

    it('follows a 12-hour, month-first locale', () => {
        const { emitted } = renderField('DateInput', '2026-10-26', {
            locale: 'en-US',
        })
        const input = screen.getByLabelText<HTMLInputElement>('Field')
        expect(input.value).toBe('10/26/2026')

        fireEvent.change(input, { target: { value: '3/28/2027' } })
        expect(emitted()).toBe('2027-03-28')
    })

    it('parses with a valueFormat the consumer passes', () => {
        const { emitted } = renderField('DateInput', '2026-10-26', {
            locale: 'de-CH',
            props: { valueFormat: 'YYYY/MM/DD' },
        })
        const input = screen.getByLabelText<HTMLInputElement>('Field')
        expect(input.value).toBe('2026/10/26')

        fireEvent.change(input, { target: { value: '2026/10/28' } })
        expect(emitted()).toBe('2026-10-28')
    })

    it('parses month names of a valueFormat in the DatesProvider locale', () => {
        const { emitted } = renderField('DateInput', '2026-10-26', {
            locale: 'de-CH',
            props: { valueFormat: 'DD MMM YYYY' },
        })
        const input = screen.getByLabelText<HTMLInputElement>('Field')
        expect(input.value).toBe('26 Okt. 2026')

        fireEvent.change(input, { target: { value: '25 Okt. 2026' } })
        expect(emitted()).toBe('2026-10-25')
    })

    it('accepts a day or month typed without its leading zero', () => {
        const { emitted } = renderField('DateInput', '2026-10-26', {
            locale: 'de-CH',
        })
        const input = screen.getByLabelText<HTMLInputElement>('Field')
        fireEvent.change(input, { target: { value: '1.02.2026' } })
        expect(emitted()).toBe('2026-02-01')
        fireEvent.change(input, { target: { value: '03.2.2026' } })
        expect(emitted()).toBe('2026-02-03')
    })

    it('does not emit while the typed date is incomplete', () => {
        const { emitted } = renderField('DateInput', '2026-10-26', {
            locale: 'de-CH',
        })
        const input = screen.getByLabelText<HTMLInputElement>('Field')
        fireEvent.change(input, { target: { value: '25.10.20' } })
        expect(emitted()).toBeUndefined()
    })
})

describe('DateTimeInputField', () => {
    it('shows a local reading as written, in the locale format', () => {
        renderField('DateTimeInput', '2026-10-26T10:00:00', {
            locale: 'de-CH',
        })
        expect(screen.getByLabelText('Field').textContent).toBe(
            '26.10.2026 10:00',
        )
    })

    it('shows the repeated hour of a fall-back night unchanged', () => {
        renderField('DateTimeInput', '2026-10-25T02:30:00', {
            locale: 'en-US',
        })
        expect(screen.getByLabelText('Field').textContent).toBe(
            '10/25/2026 2:30 AM',
        )
    })

    it("shows a legacy value with an offset as the viewer's reading and warns once", () => {
        setDevMode(true)
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { emitted } = renderField(
            'DateTimeInput',
            '2026-10-26T09:00:00Z',
            { locale: 'de-CH' },
        )
        const viewerZone = new Intl.DateTimeFormat().resolvedOptions().timeZone
        expect(screen.getByLabelText('Field').textContent).toBe(
            viewerZone === 'Europe/Zurich'
                ? '26.10.2026 10:00'
                : '26.10.2026 02:00',
        )
        expect(emitted()).toBeUndefined()
        expect(warn).toHaveBeenCalledTimes(1)
        expect(warn.mock.calls[0]?.[0]).toContain('carries an offset')
    })

    it('emits a local reading without an offset when a day is picked', () => {
        const { emitted } = renderField(
            'DateTimeInput',
            '2026-10-26T10:00:00',
            { locale: 'en-GB' },
        )
        fireEvent.click(screen.getByLabelText('Field'))
        fireEvent.click(screen.getByRole('button', { name: '25 October 2026' }))
        expect(emitted()).toBe('2026-10-25T10:00:00')
    })

    it('keeps the repeated hour when the fall-back day is picked', () => {
        const { emitted } = renderField(
            'DateTimeInput',
            '2026-10-24T02:30:00',
            { locale: 'en-GB' },
        )
        fireEvent.click(screen.getByLabelText('Field'))
        fireEvent.click(screen.getByRole('button', { name: '25 October 2026' }))
        expect(emitted()).toBe('2026-10-25T02:30:00')
    })

    it('moves a reading in the skipped hour of the viewer zone, a Mantine limitation', () => {
        const { emitted } = renderField(
            'DateTimeInput',
            '2027-03-27T02:30:00',
            { locale: 'en-GB' },
        )
        fireEvent.click(screen.getByLabelText('Field'))
        fireEvent.click(screen.getByRole('button', { name: '28 March 2027' }))
        const viewerZone = new Intl.DateTimeFormat().resolvedOptions().timeZone
        expect(emitted()).toBe(
            viewerZone === 'Europe/Zurich'
                ? '2027-03-28T03:30:00'
                : '2027-03-28T02:30:00',
        )
    })
})

describe('TimeInputField', () => {
    function inputs(container: HTMLElement) {
        return Array.from(
            container.querySelectorAll<HTMLInputElement>(
                'input:not([type=hidden])',
            ),
        )
    }

    it('shows HH:mm:ss on a 24-hour clock and emits HH:mm:ss', () => {
        const { view, emitted } = renderField('TimeInput', '09:30:00', {
            locale: 'de-CH',
        })
        const [hours, minutes] = inputs(view.container)
        expect(hours.value).toBe('09')
        expect(minutes.value).toBe('30')
        expect(view.container.querySelector('select')).toBeNull()

        fireEvent.change(hours, { target: { value: '14' } })
        expect(emitted()).toBe('14:30:00')
    })

    it('shows a 12-hour clock for a locale that uses one', () => {
        const { view, emitted } = renderField('TimeInput', '21:30:00', {
            locale: 'en-US',
        })
        const [hours, minutes] = inputs(view.container)
        expect(hours.value).toBe('09')
        expect(minutes.value).toBe('30')
        expect(view.container.querySelector('select')?.value).toBe('PM')

        fireEvent.change(minutes, { target: { value: '45' } })
        expect(emitted()).toBe('21:45:00')
    })

    it('emits null when cleared', () => {
        const { view, emitted } = renderField('TimeInput', '09:30:00', {
            locale: 'de-CH',
            props: { clearable: true },
        })
        fireEvent.click(view.container.querySelector('button')!)
        expect(emitted()).toBeNull()
    })

    it('keeps the other segments when one is erased', () => {
        const { view, emitted, fromOutside } = renderField(
            'TimeInput',
            '09:30:00',
            {
                locale: 'de-CH',
            },
        )
        const [hours, minutes] = inputs(view.container)

        fireEvent.keyDown(hours, { key: 'Backspace' })
        expect(emitted()).toBeNull()
        expect(hours.value).toBe('')
        expect(minutes.value).toBe('30')

        // Leaving the field marks it blurred, which is not a write.
        fireEvent.focusOut(hours)
        fromOutside((form) => {
            expect(form.getFieldMeta('value')?.isBlurred).toBe(true)
        })
        expect(inputs(view.container)).toEqual([hours, minutes])
        expect(minutes.value).toBe('30')

        fireEvent.change(hours, { target: { value: '11' } })
        expect(emitted()).toBe('11:30:00')
        expect(minutes.value).toBe('30')
    })

    it('shows a value set from outside the field', () => {
        const { view, fromOutside } = renderField('TimeInput', '09:30:00', {
            locale: 'de-CH',
        })
        fromOutside((form) => form.setFieldValue('value', '14:15:00'))
        let [hours, minutes] = inputs(view.container)
        expect(hours.value).toBe('14')
        expect(minutes.value).toBe('15')

        fromOutside((form) => form.setFieldValue('value', null))
        ;[hours, minutes] = inputs(view.container)
        expect(hours.value).toBe('')
        expect(minutes.value).toBe('')
    })

    it('restores every segment on a reset after a partial edit', () => {
        const { view, emitted, fromOutside } = renderField(
            'TimeInput',
            '09:30:00',
            { locale: 'de-CH' },
        )
        fireEvent.keyDown(inputs(view.container)[0], { key: 'Backspace' })
        expect(emitted()).toBeNull()

        fromOutside((form) => form.reset())
        const [hours, minutes] = inputs(view.container)
        expect(hours.value).toBe('09')
        expect(minutes.value).toBe('30')
    })

    it('clears a partial edit on a reset to an empty default', () => {
        const { view, emitted, fromOutside } = renderField('TimeInput', null, {
            locale: 'de-CH',
        })
        let [hours, minutes] = inputs(view.container)
        fireEvent.change(hours, { target: { value: '09' } })
        fireEvent.change(minutes, { target: { value: '30' } })
        expect(emitted()).toBe('09:30:00')
        fireEvent.keyDown(minutes, { key: 'Backspace' })
        expect(emitted()).toBeNull()

        fromOutside((form) => form.reset())
        ;[hours, minutes] = inputs(view.container)
        expect(hours.value).toBe('')
        expect(minutes.value).toBe('')
    })

    it('clears a partial edit when null is set from outside', () => {
        const { view, emitted, fromOutside } = renderField(
            'TimeInput',
            '09:30:00',
            { locale: 'de-CH' },
        )
        fireEvent.keyDown(inputs(view.container)[0], { key: 'Backspace' })
        expect(emitted()).toBeNull()

        fromOutside((form) => form.setFieldValue('value', null))
        const [hours, minutes] = inputs(view.container)
        expect(hours.value).toBe('')
        expect(minutes.value).toBe('')
    })

    it('never remounts the picker for its own edits', () => {
        const { view, emitted } = renderField('TimeInput', '09:30:00', {
            locale: 'de-CH',
            strict: true,
        })
        const [hours, minutes] = inputs(view.container)
        fireEvent.keyDown(hours, { key: 'Backspace' })
        fireEvent.change(hours, { target: { value: '11' } })
        fireEvent.change(minutes, { target: { value: '45' } })
        expect(emitted()).toBe('11:45:00')
        expect(inputs(view.container)).toEqual([hours, minutes])
    })

    it('keeps partial edits and outside changes apart under StrictMode', () => {
        const { view, emitted, fromOutside } = renderField(
            'TimeInput',
            '09:30:00',
            { locale: 'de-CH', strict: true },
        )
        let [hours, minutes] = inputs(view.container)
        fireEvent.keyDown(hours, { key: 'Backspace' })
        expect(emitted()).toBeNull()
        expect(minutes.value).toBe('30')

        fromOutside((form) => form.setFieldValue('value', null))
        ;[hours, minutes] = inputs(view.container)
        expect(hours.value).toBe('')
        expect(minutes.value).toBe('')

        fromOutside((form) => form.reset())
        ;[hours, minutes] = inputs(view.container)
        expect(hours.value).toBe('09')
        expect(minutes.value).toBe('30')
    })
})
