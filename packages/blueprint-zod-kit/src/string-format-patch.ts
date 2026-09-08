import * as zod from 'zod'

/**
 * Polyfill for `.stringFormat()`, which Orval emits but Zod v4 does not provide.
 *
 * Must run before any generated api-zod module is imported, so call it from the app entry
 * point. Exposed as a function rather than an import-time side effect so that importing
 * this package stays inert; `@collana-solutions/blueprint-zod-kit/install` is the
 * side-effect entry point for consumers that want the old behaviour.
 */
export function applyStringFormatPatch(): void {
  const proto = Object.getPrototypeOf(zod.email()) as Record<string, unknown>
  if (typeof proto.stringFormat !== 'function') {
    proto.stringFormat = function () {
      return this
    }
  }
}
