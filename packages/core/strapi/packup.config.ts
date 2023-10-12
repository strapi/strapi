// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from '@strapi/pack-up';

export default defineConfig({
  bundles: [
    {
      source: './src/commands/index.ts',
      import: './dist/cli.mjs',
      require: './dist/cli.js',
    },
  ],
  externals: [
    'async_hooks',
    'cluster',
    'assert',
    'assert/strict',
    'crypto',
    'fs',
    'fs/promises',
    'http',
    'os',
    'path',
    'repl',
    'stream',
  ],
  runtime: 'node',
});
