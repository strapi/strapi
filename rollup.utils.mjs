import path from 'node:path';
import { rimraf } from 'rimraf';
import { execSync, exec } from 'node:child_process';

import { defineConfig } from 'rollup';
import swc from '@rollup/plugin-swc';
import json from '@rollup/plugin-json';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const runTypeCheckAndDeclarations = (baseDir) => {
  try {
    console.log('Running TypeScript type checking and declaration generation...');
    exec('yarn run -T tsc -p tsconfig.build.json --emitDeclarationOnly', {
      stdio: 'inherit',
      cwd: baseDir,
    });
    console.log('Type declarations generated successfully.');
  } catch (error) {
    console.error('TypeScript compilation failed:', error);
    process.exit(1);
  }
};

const basePlugins = () => [
  json(),
  nodeResolve({
    extensions: ['.ts', '.tsx'],
  }),
  commonjs({
    ignoreDynamicRequires: true,
  }),
  swc({
    swc: {
      jsc: {
        parser: {
          syntax: 'typescript',
          tsx: false, // Set to true if using TSX
        },
        target: 'es2020',
      },
      sourceMaps: true,
    },
  }),
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
        exports: 'named',
        format: 'cjs',
        sourcemap: true,
      },
      {
        dir: outDir,
        entryFileNames: '[name].mjs',
        chunkFileNames: 'chunks/[name]-[hash].mjs',
        exports: 'named',
        format: 'esm',
        sourcemap: true,
      },
    ],
    plugins: [
      {
        name: 'delete',
        async buildStart() {
          await rimraf(outDir);
        },
      },
      // {
      //   name: 'typescript',
      //   buildStart(ctx) {
      //     // runTypeCheckAndDeclarations(baseDir);
      //   },
      // },
      ...basePlugins(baseDir),
    ],
  });
};

export { baseConfig, basePlugins };
