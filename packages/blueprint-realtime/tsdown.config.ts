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
  // @microsoft/signalr is a peer, loaded with a dynamic import once a ticket enables real-time.
  // Bundling it here would put it in front of every consumer, enabled or not.
  external: ['@microsoft/signalr'],
  minify: false,
})
