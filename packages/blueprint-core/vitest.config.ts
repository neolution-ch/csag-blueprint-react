import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'blueprint-core',
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
