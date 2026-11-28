import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node22',
  outDir: 'dist',
  splitting: false,
  noExternal: [/.*/],
  outExtension: () => ({ js: '.cjs' }),
});
