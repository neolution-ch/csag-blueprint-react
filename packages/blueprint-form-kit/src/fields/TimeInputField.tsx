import { useEffect, useRef, useState } from 'react'
import { TimePicker, useDatesContext } from '@mantine/dates'
import type { TimePickerProps } from '@mantine/dates'
import { useFieldContext } from '../form-context'
import { useSelector } from '@tanstack/react-store'
import { hourFormat } from './date-formats'
import { toTimeOfDay } from './wire-values'

type Props = Omit<TimePickerProps, 'value' | 'onChange' | 'onBlur' | 'error'>

interface PickerSync {
    /** The form value the picker's segments currently stand for. */
    source: string | null | undefined
    /** The string passed to the picker as `value`. */
    shown: string
    /** Remounts the picker, so it reads `shown` afresh. */
    generation: number
}

function syncFrom(
    value: string | null | undefined,
    generation: number,
): PickerSync {
    return { source: value, shown: toTimeOfDay(value) ?? '', generation }
}

/**
 * Time-of-day field — stores "HH:mm:ss" in the form state, the format
 * System.Text.Json writes for a `TimeOnly`. An incomplete or cleared input is
 * null.
 *
 * Shows a 12- or 24-hour clock following the `DatesProvider` locale unless
 * `format` is given. Mantine's `TimePicker` is used rather than `TimeInput`,
 * whose native `<input type="time">` follows the browser's locale instead of
 * the UI language.
 *
 * The picker emits `''` while a segment is empty, and clears every segment
 * whenever its `value` becomes `''`. So the form's null is not passed back to
 * it: the picker keeps its last value and its own partial segments. A value
 * written from outside (a reset, `setFieldValue`) remounts the picker with
 * that value instead, even when it is the null the form already holds.
 */
export default function TimeInputField({ format, ...props }: Props) {
    const field = useFieldContext<string | null>()
    const submissionAttempts = useSelector(
        field.form.store,
        (s) => s.submissionAttempts,
    )
    const dates = useDatesContext()
    const formValue = field.state.value
    const [picker, setPicker] = useState(() => syncFrom(formValue, 0))
    if (formValue !== picker.source) {
        setPicker(syncFrom(formValue, picker.generation + 1))
    }

    // A write of the value this field already holds leaves `field.state.value`
    // unchanged, so it is recognised in the store instead: any write that
    // replaces both the values and this field's meta, other than the field's
    // own `handleChange` below, came from outside.
    const ownWrite = useRef(false)
    const { form, name } = field
    useEffect(() => {
        let previous = form.baseStore.state
        const subscription = form.baseStore.subscribe((next) => {
            const before = previous
            previous = next
            const metaOf = (state: typeof next) =>
                (state.fieldMetaBase as Record<string, unknown>)[name]
            if (
                ownWrite.current ||
                next.values === before.values ||
                metaOf(next) === metaOf(before)
            ) {
                return
            }
            const value = form.getFieldValue(name) as string | null | undefined
            setPicker((current) => syncFrom(value, current.generation + 1))
        })
        return () => subscription.unsubscribe()
    }, [form, name])

    return (
        <TimePicker
            key={picker.generation}
            id={field.name}
            name={field.name}
            value={picker.shown}
            onBlur={field.handleBlur}
            onChange={(raw) => {
                const value = toTimeOfDay(raw)
                setPicker((current) => ({
                    ...current,
                    source: value,
                    shown: value ?? current.shown,
                }))
                ownWrite.current = true
                try {
                    field.handleChange(value)
                } finally {
                    ownWrite.current = false
                }
            }}
            format={format ?? hourFormat(dates.locale)}
            error={
                (field.state.meta.isBlurred || submissionAttempts > 0) &&
                field.state.meta.errors.length > 0
                    ? field.state.meta.errors
                          .map(
                              (e) =>
                                  (e as { message?: string }).message ??
                                  String(e),
                          )
                          .join(', ')
                    : undefined
            }
            {...props}
        />
    )
}
