import babel from 'rollup-plugin-babel';
import resolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import svg from 'rollup-plugin-svg';
import postcss from 'rollup-plugin-postcss';
import rebasePlugin from 'rollup-plugin-rebase';
import { terser } from 'rollup-plugin-terser';
import replace from 'rollup-plugin-replace';
import filesize from 'rollup-plugin-filesize';
import pkg from './package.json';

export default {
  input: './lib/src/index.js',
  output: [
    {
      exports: 'named',
      file: pkg.main,
      format: 'cjs',
      sourceMap: false,
      name: 'strapi-helper-plugin',
      compact: true,
      globals: {
        react: 'React',
        'react-dom': 'ReactDOM',
      },
    },
    {
      exports: 'named',
      sourceMap: false,
      file: pkg.module,
      format: 'es',
      name: 'strapi-helper-plugin',
      compact: true,
      globals: {
        react: 'React',
        'react-dom': 'ReactDOM',
      },
    },
  ],
  plugins: [
    postcss({
      modules: true,
      minimize: true,
    }),
    rebasePlugin(),
    resolve(),
    babel({
      exclude: 'node_modules/**',
    }),
    commonjs(),
    svg(),
    terser(),
    filesize(),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
    })
  ],

  external: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ],
};
