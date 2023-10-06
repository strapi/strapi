// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from '@strapi/pack-up';

export default defineConfig({
  externals: ['crypto', 'node:async_hooks', 'node:path', 'path', 'stream', 'timers', 'tty'],
  runtime: 'node',
});
