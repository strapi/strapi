// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from '@strapi/pack-up';

export default defineConfig({
  bundles: [
    {
      source: './src/index.ts',
      import: './dist/index.mjs',
      require: './dist/index.js',
      types: './dist/index.d.ts',
      runtime: 'node',
    },
  ],
  dist: './dist',
});
