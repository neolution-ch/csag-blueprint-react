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
    ignores: [
      '**/dist/**',
      'eslint.config.js',
      'prettier.config.js',
      '**/tsdown.config.ts',
    ],
  },
]
