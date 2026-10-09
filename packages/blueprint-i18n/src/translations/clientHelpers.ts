import type { TranslationsPayload } from './types'

interface ResolveClientTranslationsOptions<T> {
  languageCode: string
  serverPayload: TranslationsPayload<T> | null
  fallback: T
}

/**
 * Reads the entry persistTranslations() wrote for a language, or null when it is missing,
 * unreadable, or not the shape that function writes.
 *
 * The shape check is not defensive programming for its own sake. localStorage outlives
 * deployments, so an entry written by an older version of the app — or truncated by a quota
 * error part-way through a write — can still be there when newer code reads it. Because
 * `typeof null === 'object'`, a stored `{"data":null}` previously resolved to `null` and every
 * caller that dereferenced the result threw during render, before {@link TranslationGuard}
 * could switch to its recovery state and reload.
 */
export function readStoredTranslations<T>(
  languageCode: string,
): TranslationsPayload<T> | null {
  try {
    const stored = localStorage.getItem(`translations:${languageCode}`)
    if (!stored) return null

    const parsed: unknown = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null) return null

    const { data, etag } = parsed as { data?: unknown; etag?: unknown }
    if (typeof data !== 'object' || data === null) return null
    if (typeof etag !== 'string') return null

    return { translations: data as T, etag }
  } catch {
    // localStorage unavailable, or a corrupt entry — treat as a cache miss
    return null
  }
}

/**
 * Resolves translations on the client with the following priority:
 * 1. Fresh payload from the API
 * 2. localStorage for the correct language
 * 3. Fallback value
 *
 * A cached entry that fails validation is treated as absent, so the caller gets its
 * `fallback` and can recover, rather than a malformed object that throws on first access.
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
  const stored = readStoredTranslations<T>(languageCode)
  if (stored) {
    return stored.translations
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
