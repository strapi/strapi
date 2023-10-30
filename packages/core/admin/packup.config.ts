import { Config, defineConfig } from '@strapi/pack-up';
import { transformWithEsbuild } from 'vite';

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
  ],
  dist: './dist',
  /**
   * Because we're exporting a server & client package
   * which have different runtimes we want to ignore
   * what they look like in the package.json
   */
  exports: {},
  plugins: [
    {
      name: 'treat-js-files-as-jsx',
      async transform(code, id) {
        /**
         * Matches all files in src/ and ee/ that end with .js
         */
        if (!id.match(/src\/.*\.js$/) && !id.match(/ee\/.*\.js$/)) {
          return null;
        }

        // Use the exposed transform from vite, instead of directly
        // transforming with esbuild
        return transformWithEsbuild(code, id, {
          loader: 'tsx',
          jsx: 'automatic',
        });
      },
    },
  ],
});

export default config;
