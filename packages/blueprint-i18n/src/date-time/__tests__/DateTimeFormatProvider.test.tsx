// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createTranslationKit } from '../../translations/createTranslationKit'
import {
    DateTimeFormatProvider,
    useDateTimeFormat,
} from '../DateTimeFormatProvider'
import { viewerTimeZone } from '../zones'

const kit = createTranslationKit<{ greeting: string }>()

function wrapperFor(languageCode: string, placeZone: string, locale?: string) {
    return ({ children }: { children: ReactNode }) => (
        <kit.TranslationProvider
            translations={{ greeting: 'Hi' }}
            languageCode={languageCode}
        >
            <DateTimeFormatProvider placeZone={placeZone} locale={locale}>
                {children}
            </DateTimeFormatProvider>
        </kit.TranslationProvider>
    )
}

describe('useDateTimeFormat', () => {
    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    it('formats in the language of the TranslationProvider', () => {
        const { result } = renderHook(() => useDateTimeFormat(), {
            wrapper: wrapperFor('de-CH', 'Europe/Zurich'),
        })
        expect(result.current.locale).toBe('de-CH')
        expect(result.current.formatDate('2026-10-21')).toBe('21.10.2026')
        expect(result.current.formatTimeOfDay('09:00:00')).toBe('09:00')
        expect(result.current.formatDuration(90)).toBe('1 Std., 30 Min.')
    })

    it('binds the place zone', () => {
        const { result } = renderHook(() => useDateTimeFormat(), {
            wrapper: wrapperFor('en-GB', 'Europe/Zurich'),
        })
        expect(result.current.placeZone).toBe('Europe/Zurich')
        expect(result.current.formatPlaceTime('2026-10-26T10:00:00')).toBe(
            viewerTimeZone() === 'Europe/Zurich'
                ? '26 Oct 2026, 10:00'
                : '26 Oct 2026, 10:00 CET',
        )

        vi.useFakeTimers()
        vi.setSystemTime(new Date('2026-10-25T23:30:00Z'))
        expect(result.current.todayAt()).toBe('2026-10-26')
        expect(result.current.todayAt('America/Los_Angeles')).toBe('2026-10-25')
    })

    it('lets an explicit locale override the UI language', () => {
        const { result } = renderHook(() => useDateTimeFormat(), {
            wrapper: wrapperFor('de-CH', 'Europe/Zurich', 'en-US'),
        })
        expect(result.current.formatDate('2026-10-21')).toBe('Oct 21, 2026')
    })

    it('follows a language switch', () => {
        let language = 'de-CH'
        const { result, rerender } = renderHook(() => useDateTimeFormat(), {
            wrapper: ({ children }) =>
                wrapperFor(language, 'Europe/Zurich')({ children }),
        })
        expect(result.current.formatDate('2026-10-21')).toBe('21.10.2026')
        language = 'en-GB'
        rerender()
        expect(result.current.formatDate('2026-10-21')).toBe('21 Oct 2026')
    })

    it('throws outside a DateTimeFormatProvider', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        expect(() => renderHook(() => useDateTimeFormat())).toThrow(
            /DateTimeFormatProvider/,
        )
    })

    it('refuses to fall back to the browser locale', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        expect(() =>
            renderHook(() => useDateTimeFormat(), {
                wrapper: ({ children }) => (
                    <DateTimeFormatProvider placeZone="Europe/Zurich">
                        {children}
                    </DateTimeFormatProvider>
                ),
            }),
        ).toThrow(/no locale/)
    })
})
