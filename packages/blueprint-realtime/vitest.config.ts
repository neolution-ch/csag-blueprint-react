import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'blueprint-realtime',
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
