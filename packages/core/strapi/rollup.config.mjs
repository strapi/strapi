import path from 'node:path';
import { defineConfig } from 'rollup';
import { basePlugins } from '../../../rollup.utils.mjs';

export default defineConfig([
  {
    input: {
      index: import.meta.dirname + '/src/index.ts',
      cli: import.meta.dirname + '/src/cli/index.ts',
      admin: import.meta.dirname + '/src/admin.ts',
      'admin-test': import.meta.dirname + '/src/admin-test.ts',
    },
    external: (id) => !path.isAbsolute(id) && !id.startsWith('.'),
    output: [
      {
        dir: import.meta.dirname + '/dist',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        exports: 'auto',
        format: 'cjs',
        sourcemap: true,
      },
      {
        dir: import.meta.dirname + '/dist',
        entryFileNames: '[name].mjs',
        chunkFileNames: 'chunks/[name]-[hash].mjs',
        exports: 'auto',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: basePlugins(import.meta.dirname),
  },
]);
