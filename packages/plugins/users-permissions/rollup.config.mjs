import { defineConfig } from 'rollup';
import path from 'path';
import { basePlugins } from '../../../rollup.utils.mjs';

export default defineConfig([
  {
    input: path.join(import.meta.dirname, 'admin/src/index.js'),
    external: (id) => !path.isAbsolute(id) && !id.startsWith('.'),
    output: [
      {
        dir: path.join(import.meta.dirname, 'dist/admin'),
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        exports: 'auto',
        format: 'cjs',
        sourcemap: true,
      },
      {
        dir: path.join(import.meta.dirname, 'dist/admin'),
        entryFileNames: '[name].mjs',
        chunkFileNames: 'chunks/[name]-[hash].mjs',
        exports: 'auto',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [...basePlugins(import.meta.dirname)],
  },
  {
    input: path.join(import.meta.dirname, 'server/index.js'),
    external: (id) => !path.isAbsolute(id) && !id.startsWith('.'),
    output: [
      {
        dir: path.join(import.meta.dirname, 'dist/server'),
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        exports: 'auto',
        format: 'cjs',
        sourcemap: true,
      },
      {
        dir: path.join(import.meta.dirname, 'dist/server'),
        entryFileNames: '[name].mjs',
        chunkFileNames: 'chunks/[name]-[hash].mjs',
        exports: 'auto',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [...basePlugins(import.meta.dirname)],
  },
]);
