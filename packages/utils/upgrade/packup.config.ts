import { defineConfig } from '@strapi/pack-up';

export default defineConfig({
  bundles: [
    {
      source: './src/cli/index.ts',
      require: './dist/cli.js',
    },
  ],
  runtime: 'node',
  minify: false,
  sourcemap: true,
});
