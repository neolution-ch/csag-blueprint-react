import { defineConfig } from 'vitest/config'

// The suite also runs under America/Los_Angeles (vitest.los-angeles.config.ts). Pinning one zone
// east and one west of UTC makes a test that only passes in the machine's own zone fail.
export default defineConfig({
  test: {
    name: 'blueprint-i18n (Europe/Zurich)',
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    env: { TZ: 'Europe/Zurich' },
  },
})
