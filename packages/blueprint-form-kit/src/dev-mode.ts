/**
 * Minimal structural declaration of the bundler-injected `import.meta.env`.
 *
 * Declared here rather than pulled in via `vite/client` so that consumers are not forced
 * to have Vite in their type graph. Every field is optional, so a bundler that injects
 * nothing leaves the heuristic below false and the dev-only diagnostics simply stay quiet.
 */
declare global {
  interface ImportMeta {
    readonly env?: {
      readonly DEV?: boolean
      readonly MODE?: string
    }
  }
}

let override: boolean | undefined

/**
 * Tell the kit whether this is a development build.
 *
 * Needed because a published package cannot reliably work this out for itself. `import.meta.env`
 * is injected by Vite's import-analysis plugin, which runs over **app source**; a dependency
 * resolved from `node_modules` is pre-bundled by the dependency optimizer instead, and that pass
 * does not define it. So the heuristic below silently reports false under `vite dev` — which is
 * how every diagnostic in this kit went quiet once it stopped being vendored app code and became
 * this package.
 *
 * Reading `process.env.NODE_ENV` instead does not fix it: this package is built with rolldown's
 * browser platform, which inlines that expression at **our** build time, freezing whatever value
 * the release ran with into the published artifact.
 *
 * Call this once during start-up from your own source, where the bundler does substitute:
 *
 * ```ts
 * setDevMode(import.meta.env.DEV)
 * ```
 *
 * Pass `undefined` to fall back to the heuristic.
 */
export function setDevMode(value: boolean | undefined): void {
  override = value
}

/**
 * True when the consumer has declared a development build via {@link setDevMode}, or when
 * `import.meta.env.DEV` is visible — which it is when this code is consumed as source, and in
 * this repository's own tests.
 */
export function isDevMode(): boolean {
  if (typeof override === 'boolean') return override
  return import.meta.env?.DEV === true
}

export {}
