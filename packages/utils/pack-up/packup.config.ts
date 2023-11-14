/**
 * Can this be imported from the package...?
 */
import { defineConfig } from './src';

export default defineConfig({
  bundles: [
    {
      source: './src/cli/index.ts',
      require: './dist/cli.js',
    },
  ],
  externals: ['node:module'],
  runtime: 'node',
  minify: false,
  sourcemap: true,
});
