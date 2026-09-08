import { createContext, use } from 'react'
import type { ReactNode } from 'react'

interface TranslationContextValue<T> {
    translations: T
    languageCode: string
}

export function createTranslationKit<T>() {
    const TranslationContext = createContext<
        TranslationContextValue<T> | undefined
    >(undefined)

    function TranslationProvider({
        translations,
        languageCode,
        children,
    }: TranslationContextValue<T> & { children: ReactNode }) {
        return (
            <TranslationContext value={{ translations, languageCode }}>
                {children}
            </TranslationContext>
        )
    }

    function useTranslations(): T {
        const ctx = use(TranslationContext)
        if (!ctx) {
            throw new Error(
                'useTranslations must be used within a TranslationProvider',
            )
        }
        return ctx.translations
    }

    function useLanguageCode(): string {
        const ctx = use(TranslationContext)
        if (!ctx) {
            throw new Error(
                'useLanguageCode must be used within a TranslationProvider',
            )
        }
        return ctx.languageCode
    }

    return {
        TranslationContext,
        TranslationProvider,
        useTranslations,
        useLanguageCode,
    }
}
