import { defineConfig } from 'rollup';
import path from 'path';
import swc from '@rollup/plugin-swc';
import json from '@rollup/plugin-json';

import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { basePlugins } from '../../../rollup.utils.mjs';

export default defineConfig([
  {
    input: import.meta.dirname + '/server/src/index.ts',
    external: (id) => !path.isAbsolute(id) && !id.startsWith('.'),
    output: [
      {
        dir: import.meta.dirname + '/dist/server',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        exports: 'named',
        format: 'cjs',
        sourcemap: true,
      },
      {
        dir: import.meta.dirname + '/dist/server',
        entryFileNames: '[name].mjs',
        chunkFileNames: 'chunks/[name]-[hash].js',
        exports: 'named',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [...basePlugins(import.meta.dirname)],
  },
  {
    input: import.meta.dirname + '/admin/src/index.ts',
    external: (id) => !path.isAbsolute(id) && !id.startsWith('.'),
    output: [
      {
        dir: import.meta.dirname + '/dist/admin',
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        exports: 'named',
        format: 'cjs',
        sourcemap: true,
      },
      {
        dir: import.meta.dirname + '/dist/admin',
        entryFileNames: '[name].mjs',
        chunkFileNames: 'chunks/[name]-[hash].js',
        exports: 'named',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [...basePlugins(import.meta.dirname)],
  },
]);
