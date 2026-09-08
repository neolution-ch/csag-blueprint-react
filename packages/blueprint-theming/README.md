# @collana-solutions/blueprint-theming

White-label tenant theming: derive a full ten-shade Mantine colour tuple from a single brand
hex, merge it into a base theme, and emit matching CSS custom properties.

Part of [csag-blueprint-react](https://github.com/neolution-ch/csag-blueprint-react). All
packages in that repository are released in lockstep — install them at the same version.

## Install

```bash
pnpm add @collana-solutions/blueprint-theming
pnpm add @mantine/core @tanstack/react-store
```

## Quick start

```ts
import { buildTenantTheme, createTenantThemeStore } from '@collana-solutions/blueprint-theming'

export const { store, setTenantThemeColor } = createTenantThemeStore()

const theme = buildTenantTheme(baseTheme, tenantColor)
```

## API

| Export                   | Kind     | What it does                                                                                                                                                                                                                                                                                                        |
| ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buildTenantTheme`       | function | Overrides the tuple named by `baseTheme.primaryColor` with shades generated from the hex, so the tenant colour follows whichever palette the app designates as primary. Returns the base theme unchanged for an invalid hex.                                                                                        |
| `buildTenantCssVars`     | function | CSS overriding the accent custom properties. Uses `html:root` selectors so the overrides win over a stylesheet's `:root` rules in both colour schemes.                                                                                                                                                              |
| `generateShades`         | function | Hex to a ten-entry Mantine tuple. Input lightness is discarded on purpose, so tenant colours keep readable contrast whatever brand hex arrives.                                                                                                                                                                     |
| `isValidHexColor`        | function | Type guard for a six-digit hex.                                                                                                                                                                                                                                                                                     |
| `createTenantThemeStore` | factory  | A store carrying the colour across the router boundary, for apps whose `MantineProvider` sits above the router. A factory rather than a shared singleton: two resolved copies of a module-level store would leave the writer and the subscriber on different instances, and the colour would silently never update. |

## License

MIT
