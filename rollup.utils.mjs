import path from 'node:path';

import { defineConfig } from 'rollup';
import swc from '@rollup/plugin-swc';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import dynamicImportVars from '@rollup/plugin-dynamic-import-vars';

import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
import html from 'rollup-plugin-html';

const basePlugins = () => [
  image(),
  html(),
  json(),
  nodeResolve({
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  }),
  commonjs({
    ignoreDynamicRequires: true,
  }),
  swc({
    swc: {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: true,
        },
        target: 'es2020',
        transform: {
          react: {
            runtime: 'automatic',
          },
        },
      },
      sourceMaps: true,
    },
  }),
  dynamicImportVars({}),
];

const baseConfig = (baseDir) => {
  const outDir = path.resolve(baseDir, 'dist');

  return defineConfig({
    input: path.resolve(baseDir, 'src/index.ts'),
    external: (id) => !path.isAbsolute(id) && !id.startsWith('.'),
    output: [
      {
        dir: outDir,
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        exports: 'auto',
        format: 'cjs',
        sourcemap: true,
      },
      {
        dir: outDir,
        entryFileNames: '[name].mjs',
        chunkFileNames: 'chunks/[name]-[hash].mjs',
        exports: 'auto',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: basePlugins(baseDir),
  });
};

export { baseConfig, basePlugins };
