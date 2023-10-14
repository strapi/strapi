// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from '@strapi/pack-up';

export default defineConfig({
  runtime: 'node',
  externals: ['crypto', 'http', 'https', 'os', 'path', 'stream', 'zlib'],
});
