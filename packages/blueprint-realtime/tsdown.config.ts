import { defineConfig } from 'tsdown'

export default defineConfig({
  // The test channel sits behind its own entry point, so it never ships in an app bundle.
  entry: ['src/index.ts', 'src/testing.tsx'],
  format: ['esm'],
  platform: 'browser',
  target: 'es2024',
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // @microsoft/signalr is a peer, loaded with a dynamic import once a ticket enables real-time.
  // Bundling it here would put it in front of every consumer, enabled or not.
  external: ['@microsoft/signalr'],
  minify: false,
})
