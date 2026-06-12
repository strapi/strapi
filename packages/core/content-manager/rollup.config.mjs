import { defineConfig } from 'rollup';
import { baseConfig } from '../../../rollup.utils.mjs';

export default defineConfig([
  baseConfig({
    input: {
      index: './server/src/index.ts',
    },
    rootDir: './server/src',
    outDir: './dist/server',
  }),
  baseConfig({
    input: {
      index: './admin/src/index.ts',
    },
    rootDir: './admin/src',
    outDir: './dist/admin',
  }),
  baseConfig({
    input: {
      index: './shared/index.ts',
    },
    outDir: './dist/shared',
  }),
]);
