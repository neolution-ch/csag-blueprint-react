import { describe, expect, it } from 'vitest'
import {
  buildTenantCssVars,
  buildTenantTheme,
  generateShades,
  isValidHexColor,
} from '../tenant-theme'
import { DEFAULT_THEME, createTheme, mergeMantineTheme } from '@mantine/core'
import type { MantineColorsTuple } from '@mantine/core'

/**
 * Stand-in for a consuming app's theme. Mirrors the shape the package cares about: a
 * primaryColor naming a tuple that buildTenantTheme is expected to override.
 */
const cyan: MantineColorsTuple = [
  '#e0fbff',
  '#b3f2ff',
  '#80e8ff',
  '#4dddff',
  '#1ad3ff',
  '#00c4f0',
  '#00a3cc',
  '#007fa3',
  '#005c7a',
  '#003a52',
]

const theme = mergeMantineTheme(
  DEFAULT_THEME,
  createTheme({ primaryColor: 'cyan', colors: { cyan } }),
)

const HEX_COLOR_REGEX = /^#[0-9a-f]{6}$/i

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = Number.parseInt(hex.slice(1), 16)
  return {
    r: (value >> 16) & 0xff,
    g: (value >> 8) & 0xff,
    b: value & 0xff,
  }
}

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

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

describe('isValidHexColor', () => {
  it('accepts 6-digit hex colours in either case', () => {
    expect(isValidHexColor('#f59e0b')).toBe(true)
    expect(isValidHexColor('#AABBCC')).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isValidHexColor(null)).toBe(false)
    expect(isValidHexColor(undefined)).toBe(false)
    expect(isValidHexColor('')).toBe(false)
    expect(isValidHexColor('f59e0b')).toBe(false)
    expect(isValidHexColor('#abc')).toBe(false)
    expect(isValidHexColor('#12345')).toBe(false)
    expect(isValidHexColor('#1234567')).toBe(false)
    expect(isValidHexColor('#aabbcg')).toBe(false)
  })
})

describe('generateShades', () => {
  it('returns 10 valid 6-digit hex colours', () => {
    const shades = generateShades('#f59e0b')
    expect(shades).toHaveLength(10)
    for (const shade of shades) {
      expect(shade).toMatch(HEX_COLOR_REGEX)
    }
  })

  it('orders shades from lightest to darkest', () => {
    const shades = generateShades('#f59e0b')
    const lightnesses = shades.map((shade) => hexToHsl(shade).l)
    for (let i = 1; i < lightnesses.length; i++) {
      expect(lightnesses[i]).toBeLessThan(lightnesses[i - 1])
    }
  })

  it('preserves the input hue across all shades', () => {
    const input = '#f59e0b'
    const { h } = hexToHsl(input)
    for (const shade of generateShades(input)) {
      expect(hueDistance(hexToHsl(shade).h, h)).toBeLessThanOrEqual(4)
    }
  })

  it('discards the input lightness', () => {
    // Same hue and saturation at different lightness yield the same ramp.
    expect(generateShades('#ff0000')).toEqual(generateShades('#800000'))
  })

  it('handles grayscale input', () => {
    const shades = generateShades('#808080')
    expect(shades).toHaveLength(10)
    for (const shade of shades) {
      expect(shade).toMatch(HEX_COLOR_REGEX)
      expect(hexToHsl(shade).s).toBe(0)
    }
  })
})

describe('buildTenantTheme', () => {
  it('returns the base theme unchanged for missing or invalid input', () => {
    expect(buildTenantTheme(theme, null)).toBe(theme)
    expect(buildTenantTheme(theme, undefined)).toBe(theme)
    expect(buildTenantTheme(theme, '')).toBe(theme)
    expect(buildTenantTheme(theme, 'not-a-colour')).toBe(theme)
    expect(buildTenantTheme(theme, '#12345')).toBe(theme)
  })

  it('overrides the cyan tuple with the generated shades', () => {
    const result = buildTenantTheme(theme, '#f59e0b')
    expect(result).not.toBe(theme)
    expect(result.colors.cyan).toEqual(generateShades('#f59e0b'))
    expect(result.primaryColor).toBe('cyan')
  })
})

describe('buildTenantCssVars', () => {
  it('returns an empty string for invalid input', () => {
    expect(buildTenantCssVars('')).toBe('')
    expect(buildTenantCssVars('not-a-colour')).toBe('')
    expect(buildTenantCssVars('#12345')).toBe('')
  })

  it('emits the three colour-scheme blocks', () => {
    const css = buildTenantCssVars('#f59e0b')
    expect(css).toContain('html:root {')
    expect(css).toContain("html:root[data-mantine-color-scheme='light'] {")
    expect(css).toContain('@media (prefers-color-scheme: light) {')
    expect(css).toContain("html:root:not([data-mantine-color-scheme='dark']) {")
  })

  it('uses shade 4 for dark and shade 6 for light with rgba variants', () => {
    const css = buildTenantCssVars('#f59e0b')
    const shades = generateShades('#f59e0b')
    const dark = hexToRgb(shades[4])
    const light = hexToRgb(shades[6])
    const darkRgb = `${dark.r}, ${dark.g}, ${dark.b}`
    const lightRgb = `${light.r}, ${light.g}, ${light.b}`
    expect(css).toContain(`--accent: ${shades[4]};`)
    expect(css).toContain(`--accent-muted: rgba(${darkRgb}, 0.5);`)
    expect(css).toContain(`--accent-subtle: rgba(${darkRgb}, 0.12);`)
    expect(css).toContain(
      `--glow: 0 0 20px rgba(${darkRgb}, 0.15), 0 0 60px rgba(${darkRgb}, 0.06);`,
    )
    expect(css).toContain(`--accent: ${shades[6]};`)
    expect(css).toContain(`--accent-muted: rgba(${lightRgb}, 0.4);`)
    expect(css).toContain(`--accent-subtle: rgba(${lightRgb}, 0.08);`)
    expect(css).toContain(
      `--glow: 0 0 20px rgba(${lightRgb}, 0.1), 0 0 60px rgba(${lightRgb}, 0.04);`,
    )
  })
})
