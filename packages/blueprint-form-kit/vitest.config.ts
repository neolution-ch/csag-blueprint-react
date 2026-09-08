import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'blueprint-form-kit',
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
