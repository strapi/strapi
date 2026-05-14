import { defineConfig } from 'rollup';
import path from 'path';
import { baseConfig } from '../../../rollup.utils.mjs';

export default defineConfig([
  baseConfig({
    input: {
      index: './server/src/index.ts',
    },
    outDir: './dist/server',
  }),
  baseConfig({
    input: {
      _internal: './_internal/index.ts',
    },
    outDir: './dist',
  }),
  baseConfig({
    input: {
      index: './admin/src/index.ts',
      ee: './admin/src/ee.ts',
      test: './admin/tests/index.ts',
    },
    outDir: './dist/admin',
  }),
]);
