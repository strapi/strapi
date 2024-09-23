// eslint-disable-next-line import/no-extraneous-dependencies
import { defineConfig } from '@strapi/pack-up';
import { builtinModules } from 'node:module';

export default defineConfig({
  bundles: [
    {
      source: './src/index.ts',
      import: './dist/index.js',
      require: './dist/index.js',
      types: './dist/index.d.ts',
      runtime: 'node',
    },
  ],
  exports: {},
  dist: './dist',
  externals: [...builtinModules],
  preserveModules: true,
});
