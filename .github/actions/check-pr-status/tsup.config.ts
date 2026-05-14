import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  outDir: 'dist',
  splitting: false,
  target: 'node20',
  platform: 'node',
  noExternal: [/.*/],
});
