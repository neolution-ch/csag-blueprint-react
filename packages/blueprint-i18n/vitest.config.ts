import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'blueprint-i18n',
    environment: 'node',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
