import { Store } from '@tanstack/react-store'

/**
 * Bridges the current tenant's theme colour across the router boundary.
 *
 * In the SPA, `<MantineProvider>` and the accent CSS variables live in
 * `main.tsx`, *above* the router — so they cannot read the tenant colour from
 * the router context directly (that only exists inside the tree). The root
 * route publishes the colour here via `setTenantThemeColor()` once `/me` has
 * loaded, and `main.tsx` subscribes with `useSelector()` to rebuild the Mantine
 * theme and re-inject the accent variables.
 *
 * Holds the raw hex string (or null for "use the default theme"); validation
 * and shade generation happen in `tenantTheme.ts`.
 */
export const tenantThemeStore = new Store<string | null>(null)

/**
 * Publishes the tenant's theme colour. No-ops when the value is unchanged so
 * subscribers only re-render when the colour actually differs.
 */
export function setTenantThemeColor(hex: string | null | undefined): void {
  const next = hex ?? null
  if (tenantThemeStore.state !== next) {
    tenantThemeStore.setState(() => next)
  }
}
