import { afterEach, describe, expect, it } from 'vitest'
import { isDevMode, setDevMode } from '../dev-mode'

afterEach(() => {
  setDevMode(undefined)
})

describe('setDevMode', () => {
  it('forces development on', () => {
    setDevMode(true)
    expect(isDevMode()).toBe(true)
  })

  // The case that matters for a release build: a consumer must be able to turn the kit's
  // diagnostics off even where the heuristic below would say otherwise.
  it('forces development off', () => {
    setDevMode(false)
    expect(isDevMode()).toBe(false)
  })

  it('falls back to the heuristic when cleared', () => {
    setDevMode(true)
    setDevMode(undefined)
    // Vitest sets import.meta.env.DEV, so the heuristic is observable here.
    expect(isDevMode()).toBe(import.meta.env?.DEV === true)
  })
})
