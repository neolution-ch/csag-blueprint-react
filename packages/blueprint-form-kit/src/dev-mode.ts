/**
 * Minimal structural declaration of the bundler-injected `import.meta.env`.
 *
 * Declared here rather than pulled in via `vite/client` so that consumers are not forced
 * to have Vite in their type graph. Every field is optional, so a bundler that injects
 * nothing leaves `isDevMode()` false and the dev-only diagnostics simply stay quiet.
 */
declare global {
  interface ImportMeta {
    readonly env?: {
      readonly DEV?: boolean
      readonly MODE?: string
    }
  }
}

/** True when the bundler marked this as a development build. */
export function isDevMode(): boolean {
  return import.meta.env?.DEV === true
}

export {}
