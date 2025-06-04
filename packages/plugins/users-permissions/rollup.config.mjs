import { defineConfig } from 'rollup';
import {  baseConfig } from '../../../rollup.utils.mjs';

export default defineConfig([
  baseConfig({
    input: {
      index: './admin/src/index.js',
    },
    rootDir: './admin/src',
    outDir: './dist/admin',
  }),
  baseConfig({
    input: {
      index: './server/index.js'
    },
    rootDir: './server',
    outDir: './dist/server',
  })
]);
