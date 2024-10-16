import { Config, defineConfig } from '@strapi/pack-up';

const config: Config = defineConfig({
  bundles: [
    {
      types: './dist/admin/src/index.d.ts',
      source: './admin/src/index.js', // TODO: change it with the .ts file
      import: './dist/admin/index.mjs',
      require: './dist/admin/index.js',
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

export default config;
