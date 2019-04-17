import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import svg from 'rollup-plugin-svg';
import postcss from 'rollup-plugin-postcss';
import rebasePlugin from 'rollup-plugin-rebase';
import pkg from './package.json';

export default {
  input: './lib/src/index.js',
  output: [
    {
      exports: 'named',
      file: pkg.main,
      format: 'cjs',
      sourceMap: true,
      name: 'strapi-helper-plugin',
      compact: true,
    },
    {
      exports: 'named',
      sourceMap: true,
      file: pkg.module,
      format: 'es',
      name: 'strapi-helper-plugin',
      compact: true,
    },
  ],

  plugins: [
    postcss({
      modules: true,
      minimize: true,
    }),
    rebasePlugin({}),
    babel({
      exclude: 'node_modules/**',
    }),
    resolve(),
    commonjs(),
    svg(),
    require('rollup-plugin-sizes')(),
  ],

  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
};
