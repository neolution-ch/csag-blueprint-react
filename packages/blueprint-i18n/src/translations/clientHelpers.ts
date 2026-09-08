import type { TranslationsPayload } from './types'

interface ResolveClientTranslationsOptions<T> {
  languageCode: string
  serverPayload: TranslationsPayload<T> | null
  fallback: T
}

/**
 * Resolves translations on the client with the following priority:
 * 1. Fresh payload from the API
 * 2. localStorage for the correct language
 * 3. Fallback value
 */
export function resolveClientTranslations<T>({
  languageCode,
  serverPayload,
  fallback,
}: ResolveClientTranslationsOptions<T>): T {
  // Prefer fresh payload from the API
  if (serverPayload?.translations) {
    return serverPayload.translations
  }

  // Fallback: try localStorage for the correct language
  try {
    const stored = localStorage.getItem(`translations:${languageCode}`)
    if (stored) {
      const parsed = JSON.parse(stored) as { data: T }
      return parsed.data
    }
  } catch {
    // localStorage unavailable — ignore
  }

  console.warn(`[translations] No translations available for ${languageCode}`)
  return fallback
}

/**
 * Persists translations to localStorage and sets an ETag cookie.
 * The cookie is set client-side to guarantee it only exists when
 * localStorage has been successfully written.
 */
export function persistTranslations<T>(
  languageCode: string,
  payload: TranslationsPayload<T>,
): void {
  try {
    localStorage.setItem(
      `translations:${languageCode}`,
      JSON.stringify({
        data: payload.translations,
        etag: payload.etag,
      }),
    )
    document.cookie = `translations_etag_${languageCode}=${payload.etag}; Path=/; SameSite=Strict`
  } catch {
    // localStorage full or unavailable — ignore
  }
}

/**
 * Clears all translation caches from localStorage and removes ETag cookies.
 */
export function clearTranslationCaches(): void {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (key?.startsWith('translations:')) {
      localStorage.removeItem(key)
    }
  }
  document.cookie
    .split(';')
    .map((c) => c.trim())
    .filter((c) => c.startsWith('translations_etag_'))
    .forEach((c) => {
      const name = c.split('=')[0]
      document.cookie = `${name}=; Path=/; Max-Age=0`
    })
}

/**
 * Returns the language of the last persisted translations, or null when none
 * are cached. Scans the translations_etag_* cookies written by
 * persistTranslations() and returns the first language that also has a
 * matching localStorage entry.
 *
 * Used as the revalidation hint when no explicit language is known (e.g.
 * anonymous users): it identifies which cached ETag to send as If-None-Match,
 * so repeat visits get a cheap 304 instead of the full payload.
 */
export function getPersistedTranslationsLanguage(): string | null {
  try {
    for (const cookie of document.cookie.split(';')) {
      const trimmed = cookie.trim()
      if (trimmed.startsWith('translations_etag_')) {
        const languageCode = trimmed.slice(
          'translations_etag_'.length,
          trimmed.indexOf('='),
        )
        if (
          languageCode &&
          localStorage.getItem(`translations:${languageCode}`)
        ) {
          return languageCode
        }
      }
    }
  } catch {
    // document.cookie / localStorage unavailable — no hint
  }
  return null
}
