import { Config, defineConfig } from '@strapi/pack-up';
import { transformWithEsbuild } from 'vite';

const config: Config = defineConfig({
  bundles: [
    {
      source: './admin/src/index.js',
      import: './dist/admin/index.mjs',
      require: './dist/admin/index.js',
      runtime: 'web',
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
