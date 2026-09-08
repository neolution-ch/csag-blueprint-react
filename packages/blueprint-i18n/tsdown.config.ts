import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'browser',
  target: 'es2024',
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // No minification: the consuming bundler minifies. Minifying here would only cost the
  // consumer readable stack traces and accurate sourcemaps.
  minify: false,
})
