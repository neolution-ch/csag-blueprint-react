import { createContext } from 'react'

/**
 * The language code of the nearest `TranslationProvider`.
 *
 * Every kit that `createTranslationKit` returns provides it alongside its own typed context.
 * It lives at module level so that code which knows nothing about an app's translations type,
 * such as `DateTimeFormatProvider`, can still format in the UI language.
 */
export const UiLanguageContext = createContext<string | undefined>(undefined)
