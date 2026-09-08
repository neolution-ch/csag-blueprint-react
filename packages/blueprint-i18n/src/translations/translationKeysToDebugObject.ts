/**
 * Recursively walks a nested translations object and replaces every leaf
 * string value with its dotted PascalCase key path.
 *
 * Example:
 *   { auth: { login: { brandName: "CSAG Blueprint" } } }
 *   → { auth: { login: { brandName: "Auth.Login.BrandName" } } }
 *
 * This is useful as a debug mode: pass `?showTranslationKeys` in the URL
 * to see translation key paths instead of translated text, making it easy
 * to identify which key produces which UI label.
 */
export function translationKeysToDebugObject<T>(obj: T): T {
  return walk(obj, []) as T
}

function walk(node: unknown, path: string[]): unknown {
  if (node === null || node === undefined) {
    return formatKey(path)
  }

  if (typeof node === 'string') {
    return formatKey(path)
  }

  if (typeof node !== 'object') {
    return node
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    result[key] = walk(value, [...path, key])
  }
  return result
}

function formatKey(segments: string[]): string {
  return segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('.')
}
