// @ts-nocheck - @rollup/plugin-* types are published wrong https://github.com/rollup/plugins/issues/1860

/** @import { ExternalOption, InputOption, OutputOptions, RollupOptions } from 'rollup' */

import path from 'node:path';
import { defineConfig } from 'rollup';
import swc from '@rollup/plugin-swc';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import dynamicImportVars from '@rollup/plugin-dynamic-import-vars';
import commonjs from '@rollup/plugin-commonjs';
import image from '@rollup/plugin-image';
// @ts-expect-error - rollup-plugin-html ships no type declarations
import html from 'rollup-plugin-html';

/** @type {ExternalOption} */
const isExernal = (id) => !path.isAbsolute(id) && !id.startsWith('.');

/** @returns {RollupOptions['plugins']} */
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

/**
 * @param {string} id
 * @param {InputOption} input
 */
const isInput = (id, input) => {
  if (typeof input === 'string') {
    return id.includes(path.resolve(input));
  }

  return Object.values(input).some((i) => id.includes(path.resolve(i)));
};

/**
 * @param {RollupOptions & {
 *   rootDir?: OutputOptions['preserveModulesRoot'];
 *   outDir?: OutputOptions['dir'];
 * }} [opts]
 */
const baseConfig = (opts = {}) => {
  const { rootDir, outDir = './dist', input = './src/index.ts', ...rest } = opts;

  return defineConfig({
    input,
    external: isExernal,
    output: baseOutput({ outDir, rootDir }),
    plugins: basePlugins(),
    onwarn(warning, warn) {
      if (warning.code === 'MIXED_EXPORTS') {
        // json files are always mixed exports
        if (warning?.id?.endsWith('.json')) {
          return;
        }

        // we only care about mixed exports in our input files
        if (warning.id && !isInput(warning.id, input)) {
          return;
        }
      }

      if (warning.code === 'UNUSED_EXTERNAL_IMPORT' && warning.exporter === 'react') {
        return;
      }

      warn(warning);
    },
    ...rest,
  });
};

/**
 * @param {{
 *   outDir: OutputOptions['dir'];
 *   rootDir: OutputOptions['preserveModulesRoot'];
 * }} options
 * @returns {RollupOptions['output']}
 */
const baseOutput = ({ outDir, rootDir }) => {
  return [
    {
      dir: outDir,
      entryFileNames: '[name].js',
      chunkFileNames: '[name]-[hash].js',
      exports: 'auto',
      format: 'cjs',
      sourcemap: true,
      preserveModules: true,
      interop: 'auto',
      ...(rootDir ? { preserveModulesRoot: rootDir } : {}),
    },
    {
      dir: outDir,
      entryFileNames: '[name].mjs',
      chunkFileNames: '[name]-[hash].mjs',
      format: 'esm',
      sourcemap: true,
      preserveModules: true,
      interop: 'auto',
      ...(rootDir ? { preserveModulesRoot: rootDir } : {}),
    },
  ];
};

const basePluginConfig = () => {
  return defineConfig([
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
  ]);
};

export { baseConfig, basePluginConfig };
