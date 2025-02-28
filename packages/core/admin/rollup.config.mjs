import { defineConfig } from 'rollup';
import path from 'path';
import { basePlugins } from '../../../rollup.utils.mjs';

export default defineConfig([
  {
    input: path.join(import.meta.dirname, 'server/src/index.ts'),
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
  {
    input: {
      _internal: path.join(import.meta.dirname, '/_internal/index.ts'),
    },
    external: (id) => !path.isAbsolute(id) && !id.startsWith('.'),
    output: [
      {
        dir: path.join(import.meta.dirname, 'dist'),
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        exports: 'auto',
        format: 'cjs',
        sourcemap: true,
      },
      {
        dir: path.join(import.meta.dirname, 'dist'),
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
    input: {
      index: './admin/src/index.ts',
      ee: './admin/src/ee.ts',
      test: './admin/tests/index.ts',
    },
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
    onwarn(warning, warn) {
      // Suppress the "default is never used" warning for React
      if (warning.code === 'UNUSED_EXTERNAL_IMPORT' && warning.exporter === 'react') {
        return;
      }

      warn(warning); // Log other warnings
    },
    plugins: [...basePlugins(import.meta.dirname)],
  },
]);
