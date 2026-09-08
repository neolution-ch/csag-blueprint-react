import { defineConfig } from 'tsdown'

export default defineConfig({
  // Two entry points: the inert API, and a side-effect module that installs both the
  // stringFormat polyfill and the error map.
  entry: ['src/index.ts', 'src/install.ts'],
  format: ['esm'],
  platform: 'browser',
  target: 'es2024',
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
})
