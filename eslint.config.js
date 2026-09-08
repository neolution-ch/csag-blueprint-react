//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  ...tanstackConfig,
  {
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // Mirrors the consuming app's rule set so files moved between the two repos
      // lint identically and cherry-picks do not churn.
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    // Everything a package imports must be declared in that package's own manifest.
    // This is the rule the app could not enforce, and the reason app-internal imports
    // leaked into the form kit while it lived under src/.
    files: ['packages/*/src/**/*.{ts,tsx}'],
    rules: {
      'import/no-extraneous-dependencies': [
        'error',
        {
          devDependencies: ['**/__tests__/**', '**/*.test.{ts,tsx}'],
          peerDependencies: true,
        },
      ],
      'import/no-relative-packages': 'error',
    },
  },
  {
    // Tests are never published: tsdown only follows src/index.ts and `files` ships dist
    // alone. So a test may reach for the root workspace dev tooling.
    files: [
      'packages/*/src/**/__tests__/**',
      'packages/*/src/**/*.test.{ts,tsx}',
    ],
    rules: { 'import/no-extraneous-dependencies': 'off' },
  },
  {
    ignores: [
      '**/dist/**',
      'eslint.config.js',
      'prettier.config.js',
      // Build and test configuration, deliberately outside every package's tsconfig
      // `include` (which is src-only), so the type-aware rules cannot parse them.
      '**/tsdown.config.ts',
      '**/vitest.config.ts',
      'vitest.config.ts',
    ],
  },
]
