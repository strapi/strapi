import { Config, defineConfig } from '@strapi/pack-up';

const config: Config = defineConfig({
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
      source: './_internal/index.ts',
      import: './dist/cli.mjs',
      require: './dist/cli.js',
      runtime: 'node',
    },
    {
      source: './server/src/index.ts',
      import: './dist/server/index.mjs',
      require: './dist/server/index.js',
      types: './dist/server/src/index.d.ts',
      tsconfig: './server/tsconfig.build.json',
      runtime: 'node',
    },
    {
      source: './ee/server/src/index.ts',
      import: './dist/ee/server/index.mjs',
      require: './dist/ee/server/index.js',
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
  // If you don't include this, it seems to think vite needs to be bundled, which isn't true.
  externals: ['vite'],
});

export default config;
