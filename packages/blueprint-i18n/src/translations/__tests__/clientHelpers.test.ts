import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  readStoredTranslations,
  resolveClientTranslations,
} from '../clientHelpers'

interface Values {
  common: { submit: string }
}

const KEY = 'translations:en-GB'

function stubLocalStorage() {
  const store = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    get length() {
      return store.size
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  })
  return store
}

describe('readStoredTranslations', () => {
  let store: Map<string, string>

  beforeEach(() => {
    store = stubLocalStorage()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns the payload for a well-formed entry', () => {
    store.set(
      KEY,
      JSON.stringify({ data: { common: { submit: 'Go' } }, etag: 'W/"1"' }),
    )

    expect(readStoredTranslations<Values>('en-GB')).toEqual({
      translations: { common: { submit: 'Go' } },
      etag: 'W/"1"',
    })
  })

  it('returns null when nothing is cached', () => {
    expect(readStoredTranslations<Values>('en-GB')).toBeNull()
  })

  // `typeof null === 'object'`, so this is the case that used to slip through and throw
  // at the first property access in the consumer's render.
  it('rejects a null data member', () => {
    store.set(KEY, JSON.stringify({ data: null, etag: 'W/"1"' }))

    expect(readStoredTranslations<Values>('en-GB')).toBeNull()
  })

  it('rejects an entry whose etag is missing', () => {
    store.set(KEY, JSON.stringify({ data: { common: {} } }))

    expect(readStoredTranslations<Values>('en-GB')).toBeNull()
  })

  it('rejects a non-object payload', () => {
    store.set(KEY, JSON.stringify('nonsense'))

    expect(readStoredTranslations<Values>('en-GB')).toBeNull()
  })

  it('rejects unparsable JSON', () => {
    store.set(KEY, '{ not json')

    expect(readStoredTranslations<Values>('en-GB')).toBeNull()
  })
})

describe('resolveClientTranslations', () => {
  let store: Map<string, string>
  const fallback: Values = { common: { submit: 'fallback' } }

  beforeEach(() => {
    store = stubLocalStorage()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('prefers a fresh server payload', () => {
    store.set(
      KEY,
      JSON.stringify({ data: { common: { submit: 'cached' } }, etag: 'W/"1"' }),
    )

    const result = resolveClientTranslations<Values>({
      languageCode: 'en-GB',
      serverPayload: {
        translations: { common: { submit: 'fresh' } },
        etag: 'W/"2"',
      },
      fallback,
    })

    expect(result.common.submit).toBe('fresh')
  })

  it('falls back to a valid cached payload', () => {
    store.set(
      KEY,
      JSON.stringify({ data: { common: { submit: 'cached' } }, etag: 'W/"1"' }),
    )

    const result = resolveClientTranslations<Values>({
      languageCode: 'en-GB',
      serverPayload: null,
      fallback,
    })

    expect(result.common.submit).toBe('cached')
  })

  // The regression this guards: a corrupt entry must resolve to the caller's fallback, which
  // a recovery guard can detect, rather than to null, which throws on first access.
  it('returns the fallback rather than a corrupt cached payload', () => {
    store.set(KEY, JSON.stringify({ data: null, etag: 'W/"1"' }))

    const result = resolveClientTranslations<Values>({
      languageCode: 'en-GB',
      serverPayload: null,
      fallback,
    })

    expect(result).toBe(fallback)
  })
})
