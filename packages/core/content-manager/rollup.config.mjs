import { defineConfig } from 'rollup';
import alias from '@rollup/plugin-alias';
import { baseConfig } from '../../../rollup.utils.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const aliasConfig = alias({
  entries: [
    { find: '@content-manager/admin', replacement: path.resolve(__dirname, './admin/src') },
    { find: '@content-manager/server', replacement: path.resolve(__dirname, './server/src') },
    { find: '@content-manager/shared', replacement: path.resolve(__dirname, './shared') },
  ],
});

export default defineConfig([
  {
    ...baseConfig({
      input: {
        index: './server/src/index.ts',
      },
      rootDir: './server/src',
      outDir: './dist/server',
    }),
    plugins: [aliasConfig, ...baseConfig().plugins],
  },
  {
    ...baseConfig({
      input: {
        index: './admin/src/index.ts',
      },
      rootDir: './admin/src',
      outDir: './dist/admin',
    }),
    plugins: [aliasConfig, ...baseConfig().plugins],
  },
  {
    ...baseConfig({
      input: {
        index: './shared/index.ts',
      },
      outDir: './dist/shared',
    }),
    plugins: [aliasConfig, ...baseConfig().plugins],
  },
]);
