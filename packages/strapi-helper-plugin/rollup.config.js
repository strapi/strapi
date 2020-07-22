const babel = require('rollup-plugin-babel');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const svg = require('rollup-plugin-svg');
const postcss = require('rollup-plugin-postcss');
const { terser } = require('rollup-plugin-terser');
const replace = require('rollup-plugin-replace');
const filesize = require('rollup-plugin-filesize');
const pkg = require('./package.json');

module.exports = {
  input: './lib/src/index.js',
  output: [
    {
      exports: 'named',
      file: pkg.main,
      format: 'cjs',
      sourceMap: false,
      name: 'strapi-helper-plugin/lib/src',
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
      name: 'strapi-helper-plugin/lib/src',
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
    }),
  ],

  external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
};
