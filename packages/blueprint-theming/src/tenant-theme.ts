import { createTheme, mergeMantineTheme } from '@mantine/core'
import type { MantineColorsTuple, MantineTheme } from '@mantine/core'

/**
 * Lightness ladder measured against a hand-tuned cyan tuple.
 * Index 0 is the lightest shade, index 9 the darkest. Input lightness is
 * intentionally discarded so tenant colours keep readable contrast.
 */
const LIGHTNESS_LADDER = [
  0.94, 0.85, 0.75, 0.65, 0.55, 0.47, 0.4, 0.32, 0.24, 0.16,
]

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/

/**
 * Returns true when the value is a 6-digit hex colour like `#0a1b2c`.
 */
export function isValidHexColor(hex: string | null | undefined): hex is string {
  return typeof hex === 'string' && HEX_COLOR_REGEX.test(hex)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = Number.parseInt(hex.slice(1), 16)
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  }
}

/**
 * Converts a 6-digit hex colour to HSL (h in degrees, s/l in [0, 1]).
 */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex)
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  if (max === min) {
    return { h: 0, s: 0, l }
  }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === rn) {
    h = (gn - bn) / d + (gn < bn ? 6 : 0)
  } else if (max === gn) {
    h = (bn - rn) / d + 2
  } else {
    h = (rn - gn) / d + 4
  }
  return { h: h * 60, s, l }
}

function hueToChannel(p: number, q: number, t: number): number {
  let tn = t
  if (tn < 0) tn += 1
  if (tn > 1) tn -= 1
  if (tn < 1 / 6) return p + (q - p) * 6 * tn
  if (tn < 1 / 2) return q
  if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6
  return p
}

function channelToHexByte(value: number): string {
  return Math.round(value * 255)
    .toString(16)
    .padStart(2, '0')
}

/**
 * Converts HSL (h in degrees, s/l in [0, 1]) to a 6-digit hex colour.
 */
function hslToHex(h: number, s: number, l: number): string {
  const hn = (((h % 360) + 360) % 360) / 360
  if (s === 0) {
    const gray = channelToHexByte(l)
    return `#${gray}${gray}${gray}`
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const r = hueToChannel(p, q, hn + 1 / 3)
  const g = hueToChannel(p, q, hn)
  const b = hueToChannel(p, q, hn - 1 / 3)
  return `#${channelToHexByte(r)}${channelToHexByte(g)}${channelToHexByte(b)}`
}

/**
 * Generates a 10-shade Mantine colour tuple from a single hex colour.
 * Keeps the input hue and saturation, discards its lightness and maps the
 * shades onto a fixed lightness ladder. The two lightest shades are slightly
 * desaturated so tints stay soft.
 */
export function generateShades(hex: string): MantineColorsTuple {
  const { h, s } = hexToHsl(hex)
  return LIGHTNESS_LADDER.map((l, index) =>
    hslToHex(h, index <= 1 ? s * 0.75 : s, l),
  ) as unknown as MantineColorsTuple
}

/**
 * Builds the Mantine theme for a tenant, overriding the colour tuple named by the base
 * theme's `primaryColor` so every primary-colour usage follows the tenant colour. Returns
 * the base theme unchanged when no valid hex is set.
 *
 * `colorKey` defaults to `baseTheme.primaryColor`, which is what makes the tenant colour
 * track whichever palette the app actually designates as primary rather than a hardcoded
 * name. Pass it explicitly only to override a non-primary tuple.
 */
export function buildTenantTheme(
  baseTheme: MantineTheme,
  hex: string | null | undefined,
  options?: { colorKey?: string },
): MantineTheme {
  if (!isValidHexColor(hex)) {
    return baseTheme
  }
  const colorKey = options?.colorKey ?? baseTheme.primaryColor
  return mergeMantineTheme(
    baseTheme,
    createTheme({
      colors: {
        [colorKey]: generateShades(hex),
      },
    }),
  )
}

/**
 * Builds CSS overriding the accent custom properties from `styles.css` with
 * the tenant colour. Uses `html:root` selectors so the overrides win over
 * the stylesheet's `:root` rules for both colour schemes. Returns an empty
 * string when the hex is invalid.
 */
export function buildTenantCssVars(hex: string): string {
  if (!isValidHexColor(hex)) {
    return ''
  }
  const shades = generateShades(hex)
  const dark = shades[4]
  const light = shades[6]
  const { r: dr, g: dg, b: db } = hexToRgb(dark)
  const { r: lr, g: lg, b: lb } = hexToRgb(light)
  const lightVars = [
    `--accent: ${light};`,
    `--accent-muted: rgba(${lr}, ${lg}, ${lb}, 0.4);`,
    `--accent-subtle: rgba(${lr}, ${lg}, ${lb}, 0.08);`,
    `--glow: 0 0 20px rgba(${lr}, ${lg}, ${lb}, 0.1), 0 0 60px rgba(${lr}, ${lg}, ${lb}, 0.04);`,
  ]
  return `html:root {
  --accent: ${dark};
  --accent-muted: rgba(${dr}, ${dg}, ${db}, 0.5);
  --accent-subtle: rgba(${dr}, ${dg}, ${db}, 0.12);
  --glow: 0 0 20px rgba(${dr}, ${dg}, ${db}, 0.15), 0 0 60px rgba(${dr}, ${dg}, ${db}, 0.06);
}

html:root[data-mantine-color-scheme='light'] {
  ${lightVars.join('\n  ')}
}

@media (prefers-color-scheme: light) {
  html:root:not([data-mantine-color-scheme='dark']) {
    ${lightVars.join('\n    ')}
  }
}
`
}
