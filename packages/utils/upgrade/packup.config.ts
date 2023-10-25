/**
 * Can this be imported from the package...?
 */
import { defineConfig } from '@strapi/pack-up';

export default defineConfig({
  bundles: [
    {
      source: './src/cli/index.ts',
      require: './dist/cli.js',
    },
  ],
  externals: [], // not sure if we should update this?
  runtime: 'node',
  minify: false,
  sourcemap: true,
});
