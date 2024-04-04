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
    {
      source: './src/cli/index.ts',
      import: './dist/cli/index.ts',
      require: './dist/cli/index.js',
      types: './dist/cli/index.d.ts',
      runtime: 'node',
    },
    {
      source: './src/admin.ts',
      import: './dist/admin.js',
      require: './dist/admin.js',
      types: './dist/admin.d.ts',
      runtime: 'web',
    },
    {
      source: './src/admin-test.ts',
      import: './dist/admin-test.js',
      require: './dist/admin-test.js',
      types: './dist/admin-test.d.ts',
      runtime: 'web',
    },
  ],
  exports: {},
  dist: './dist',
  externals: [...builtinModules],
  preserveModules: true,
});
