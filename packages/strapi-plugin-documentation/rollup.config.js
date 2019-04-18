import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import svg from 'rollup-plugin-svg';
import postcss from 'rollup-plugin-postcss';
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
      limit: 10 * 1024,
      emitFiles: true,
    }),
    babel({
      exclude: 'node_modules/**',
    }),
    commonjs(),
    resolve(),
    json({
      exclude: 'node_modules/**',
      compact: true,
    }),
    svg(),
    require('rollup-plugin-sizes')(),
  ],

  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
};
