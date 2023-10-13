// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from '@strapi/pack-up';

export default defineConfig({
  bundles: [
    {
      source: './src/create-strapi-starter.ts',
      import: './dist/create-strapi-starter.mjs',
      require: './dist/create-strapi-starter.js',
    },
  ],
  dist: './dist',
  externals: ['child_process', 'node:fs', 'node:path', 'os', 'path'],
  runtime: 'node',
});
