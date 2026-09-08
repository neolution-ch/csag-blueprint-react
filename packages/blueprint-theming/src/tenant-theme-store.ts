import { Store } from '@tanstack/react-store'

export interface TenantThemeStore {
  /** Holds the raw hex string, or null for "use the base theme unchanged". */
  store: Store<string | null>
  /**
   * Publishes the tenant's theme colour. No-ops when the value is unchanged, so
   * subscribers only re-render when the colour actually differs.
   */
  setTenantThemeColor: (hex: string | null | undefined) => void
}

/**
 * Creates a store that carries the current tenant's theme colour across the router
 * boundary.
 *
 * In an SPA, `<MantineProvider>` and the accent CSS variables typically live above the
 * router, so they cannot read the tenant colour from router context. The root route
 * publishes the colour here once the current user has loaded, and the code above the
 * router subscribes with `useSelector()` to rebuild the theme and re-inject the variables.
 *
 * This is a factory rather than a module-level singleton on purpose: a shared mutable
 * instance exported from a package breaks silently if the consumer ever resolves two
 * copies of it, with the writer and the subscriber holding different stores and the
 * colour simply never updating. Creating the instance in the app makes ownership explicit.
 *
 * Validation and shade generation live in `tenant-theme.ts`.
 */
export function createTenantThemeStore(
  initialColor: string | null = null,
): TenantThemeStore {
  const store = new Store<string | null>(initialColor)

  function setTenantThemeColor(hex: string | null | undefined): void {
    const next = hex ?? null
    if (store.state !== next) {
      store.setState(() => next)
    }
  }

  return { store, setTenantThemeColor }
}
