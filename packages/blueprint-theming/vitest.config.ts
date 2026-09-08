import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'blueprint-theming',
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
