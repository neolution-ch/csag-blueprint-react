export { interpolate } from './interpolate'

// Translations
export {
  // Types
  type TranslationsPayload,
  type TranslationsResult,

  // Factories
  createTranslationKit,

  // Client helpers
  resolveClientTranslations,
  persistTranslations,
  clearTranslationCaches,
  getPersistedTranslationsLanguage,

  // Components
  TranslationGuard,

  // Debug
  translationKeysToDebugObject,
} from './translations'
