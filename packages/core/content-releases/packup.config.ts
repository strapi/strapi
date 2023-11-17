import { defineConfig } from '@strapi/pack-up';

export default defineConfig({
  bundles: [
    {
      source: './admin/src/index.ts',
      import: './dist/admin/index.mjs',
      require: './dist/admin/index.js',
      types: './dist/admin/src/index.d.ts',
      tsconfig: './admin/tsconfig.build.json',
      runtime: 'web',
    },
    {
      source: './server/src/index.ts',
      import: './dist/server/index.mjs',
      require: './dist/server/index.js',
      types: './dist/server/src/index.d.ts',
      tsconfig: './server/tsconfig.build.json',
      runtime: 'node',
    },
  ],
  dist: './dist',
  /**
   * Because we're exporting a server & client package
   * which have different runtimes we want to ignore
   * what they look like in the package.json
   */
  exports: {},
});
