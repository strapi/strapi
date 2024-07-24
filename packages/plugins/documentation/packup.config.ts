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
});

export default config;
