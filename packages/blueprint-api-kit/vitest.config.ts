import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'blueprint-api-kit',
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
