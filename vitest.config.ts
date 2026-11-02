import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // A package can add a second config (vitest.<variant>.config.ts) to run its suite again
    // under different settings, such as another time zone.
    projects: ['packages/*', 'packages/*/vitest.*.config.ts'],
  },
})
