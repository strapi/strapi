import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import svg from 'rollup-plugin-svg';
import postcss from 'rollup-plugin-postcss';
import { terser } from 'rollup-plugin-terser';

import url from 'rollup-plugin-url';
import json from 'rollup-plugin-json';
import pkg from './package.json';

export default {
  input: './admin/src/index.js',
  output: [
    {
      exports: 'named',
      file: `admin/dist/${pkg.name}.cjs.js`,
      format: 'cjs',
      sourceMap: true,
      name: pkg.name,
      compact: true,
    },
    {
      exports: 'named',
      sourceMap: true,
      file: `admin/dist/${pkg.name}.esm.js`,
      format: 'es',
      name: pkg.name,
      compact: true,
    },
  ],

  plugins: [
    postcss({
      modules: true,
      minimize: true,
    }),
    url({
      limit: 10 * 1024, // inline files < 10k, copy files > 10k
      emitFiles: true, // defaults to true
    }),
    // rebasePlugin({}),
    babel({
      exclude: 'node_modules/**',
    }),
    commonjs(),
    resolve(),
    json({
      exclude: 'node_modules/**',
      compact: true, // Default: false
    }),

    svg(),
    require('rollup-plugin-sizes')(),
    terser(),
  ],

  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
};
