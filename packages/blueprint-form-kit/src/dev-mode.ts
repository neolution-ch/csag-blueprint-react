/**
 * Minimal structural declaration of the bundler-injected globals this module reads.
 *
 * Declared here rather than pulled in via `vite/client` or `@types/node` so that consumers
 * are not forced to have either in their type graph. Every field is optional, so a bundler
 * that injects nothing leaves `isDevMode()` false and the dev-only diagnostics stay quiet.
 */
declare global {
  interface ImportMeta {
    readonly env?: {
      readonly DEV?: boolean
      readonly MODE?: string
    }
  }

  var process: { env?: { NODE_ENV?: string } } | undefined
}

/**
 * True when the bundler marked this as a development build.
 *
 * `process.env.NODE_ENV` is checked first because it is the only one of the two that is
 * reliably defined *inside a dependency*. Vite injects `import.meta.env` from its
 * import-analysis plugin, which runs over app source; a package resolved out of node_modules
 * is instead pre-bundled by the dependency optimizer, whose define block sets `NODE_ENV` and
 * nothing else. Reading only `import.meta.env` therefore silenced every diagnostic in this
 * kit under `vite dev` the moment it stopped being vendored app source and became a
 * published dependency — which is exactly how it ships now. Rollup, webpack, esbuild and
 * Jest all define `NODE_ENV` as well, so it is also the more portable signal.
 *
 * `import.meta.env.DEV` stays as a fallback for a bundler that sets it without `NODE_ENV`.
 */
export function isDevMode(): boolean {
  const nodeEnv =
    typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined
  if (typeof nodeEnv === 'string') return nodeEnv !== 'production'

  return import.meta.env?.DEV === true
}

export {}
