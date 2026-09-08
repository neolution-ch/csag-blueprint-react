import { defineConfig } from 'tsdown'

export default defineConfig({
  // The session hook is the only router-dependent export, so it sits behind its own
  // entry point and an optional peer dependency.
  entry: ['src/index.ts', 'src/session/index.ts'],
  format: ['esm'],
  platform: 'browser',
  target: 'es2024',
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
})
