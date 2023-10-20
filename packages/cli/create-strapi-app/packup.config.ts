// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from '@strapi/pack-up';

export default defineConfig({
  bundles: [
    {
      source: './src/create-strapi-app.ts',
      import: './dist/create-strapi-app.mjs',
      require: './dist/create-strapi-app.js',
    },
  ],
  dist: './dist',
  runtime: 'node',
});
