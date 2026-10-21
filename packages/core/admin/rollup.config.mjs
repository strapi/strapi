import { defineConfig } from 'rollup';
import { baseConfig } from '../../../rollup.utils.mjs';

export default defineConfig([
  baseConfig({
    input: {
      index: './server/src/index.ts',
    },
    rootDir: '.',
    outDir: './dist/server',
  }),
  baseConfig({
    input: {
      _internal: './_internal/index.ts',
    },
    rootDir: '.',
    outDir: './dist',
  }),
  baseConfig({
    input: {
      index: './admin/src/index.ts',
      ee: './admin/src/ee.ts',
      test: './admin/tests/index.ts',
    },
    rootDir: '.',
    outDir: './dist/admin',
  }),
]);
