export interface TranslationsPayload<T> {
  translations: T
  etag: string
}

export interface TranslationsResult<T> {
  languageCode: string
  translationsEtag: string
  _translationPayload: TranslationsPayload<T> | null
}
