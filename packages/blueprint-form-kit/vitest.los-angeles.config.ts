import { defineConfig } from 'vitest/config'

// vitest.config.ts again, under a zone west of UTC.
export default defineConfig({
  test: {
    name: 'blueprint-form-kit (America/Los_Angeles)',
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    env: { TZ: 'America/Los_Angeles' },
  },
})
