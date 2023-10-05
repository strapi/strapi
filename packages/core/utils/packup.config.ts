import { defineConfig } from '@strapi/pack-up';

export default defineConfig({
  externals: ['node:stream'],
  runtime: 'node',
});
