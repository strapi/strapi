// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from '@strapi/pack-up';
import { builtinModules } from 'node:module';

export default defineConfig({
  bundles: [
    {
      source: './src/cli.ts',
      require: './dist/cli.js',
      runtime: 'node',
    },
  ],
  externals: [...builtinModules],
  preserveModules: true,
  runtime: 'node',
});
