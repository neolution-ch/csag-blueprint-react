import { createContext, use, useMemo } from 'react'
import type { ReactNode } from 'react'
import { UiLanguageContext } from '../ui-language'
import {
    formatDate,
    formatDateRange,
    formatDuration,
    formatInstant,
    formatPlaceTime,
    formatTimeOfDay,
} from './format'
import type {
    DateFormatOptions,
    DateTimeFormatOptions,
    DurationFormatOptions,
    InstantFormatOptions,
} from './format'
import { todayAt } from './zones'

type Input = string | null | undefined

/** The formatters, bound to the UI language and the place zone. */
export interface DateTimeFormatters {
    readonly locale: string
    readonly placeZone: string
    formatInstant: (isoInstant: Input, options?: InstantFormatOptions) => string
    formatPlaceTime: (
        localReading: Input,
        options?: DateTimeFormatOptions,
    ) => string
    formatDate: (date: Input, options?: DateFormatOptions) => string
    formatTimeOfDay: (time: Input) => string
    formatDuration: (
        minutes: number | null | undefined,
        options?: DurationFormatOptions,
    ) => string
    formatDateRange: (
        from: Input,
        to: Input,
        options?: DateFormatOptions,
    ) => string
    /** Today in the place zone, or in `zone` when given, as `YYYY-MM-DD`. */
    todayAt: (zone?: string) => string
}

function bindFormatters(locale: string, placeZone: string): DateTimeFormatters {
    return {
        locale,
        placeZone,
        formatInstant: (value, options) =>
            formatInstant(value, { ...options, locale }),
        formatPlaceTime: (value, options) =>
            formatPlaceTime(value, { ...options, locale, placeZone }),
        formatDate: (value, options) =>
            formatDate(value, { ...options, locale }),
        formatTimeOfDay: (value) => formatTimeOfDay(value, { locale }),
        formatDuration: (value, options) =>
            formatDuration(value, { ...options, locale }),
        formatDateRange: (from, to, options) =>
            formatDateRange(from, to, { ...options, locale }),
        todayAt: (zone) => todayAt(zone ?? placeZone),
    }
}

const DateTimeFormatContext = createContext<DateTimeFormatters | undefined>(
    undefined,
)

export interface DateTimeFormatProviderProps {
    /** The IANA zone that place times belong to: the tenant's zone. */
    placeZone: string
    /**
     * Overrides the formatting locale. Defaults to the language of the nearest
     * `TranslationProvider`, which is the UI language.
     */
    locale?: string
    children: ReactNode
}

/**
 * Binds the date and time formatters to the UI language and the place zone, for
 * `useDateTimeFormat` below it.
 */
export function DateTimeFormatProvider({
    placeZone,
    locale,
    children,
}: DateTimeFormatProviderProps) {
    const uiLanguage = use(UiLanguageContext)
    const resolvedLocale = locale ?? uiLanguage
    const value = useMemo(
        () =>
            resolvedLocale
                ? bindFormatters(resolvedLocale, placeZone)
                : undefined,
        [resolvedLocale, placeZone],
    )
    if (!value) {
        throw new Error(
            'DateTimeFormatProvider has no locale: render it inside a TranslationProvider or pass `locale`',
        )
    }
    return (
        <DateTimeFormatContext value={value}>{children}</DateTimeFormatContext>
    )
}

/** The formatters bound to the UI language and place zone of the nearest `DateTimeFormatProvider`. */
export function useDateTimeFormat(): DateTimeFormatters {
    const ctx = use(DateTimeFormatContext)
    if (!ctx) {
        throw new Error(
            'useDateTimeFormat must be used within a DateTimeFormatProvider',
        )
    }
    return ctx
}
