// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from '@strapi/pack-up';

export default defineConfig({
  externals: ['crypto', 'fs', 'node:fs', 'node:os', 'node:path', 'node:readline', 'os', 'path'],
  runtime: 'node',
});
