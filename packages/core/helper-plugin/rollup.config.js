import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import nodePolyfills from 'rollup-plugin-node-polyfills';
import babel from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import svg from 'rollup-plugin-svg';
import image from '@rollup/plugin-image';
import postcss from 'rollup-plugin-postcss';
import packageJson from './package.json';

export default {
  input: './lib/src/index.js',
  output: [
    {
      file: packageJson.main,
      format: 'cjs',
      sourcemap: false,
    },
    {
      file: packageJson.module,
      format: 'esm',
      sourcemap: false,
    },
  ],
  plugins: [
    peerDepsExternal({
      packageJsonPath: './package.json',
    }),
    image(),
    postcss({
      extensions: ['.css'],
    }),
    nodeResolve({
      extensions: ['.js'],
      preferBuiltins: true,
    }),
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
    }),
    babel({
      presets: [
        [
          '@babel/preset-env',
          {
            modules: false,
            targets: {
              browsers: ['Since 2017'],
            },
          },
        ],
        '@babel/preset-react',
      ],
      babelHelpers: 'runtime',
      plugins: [
        '@babel/plugin-transform-runtime',
        '@babel/plugin-proposal-class-properties',
        ['babel-plugin-styled-components', { pure: true }],
      ],
      exclude: 'node_modules/**',
    }),
    commonjs(),
    svg(),

    nodePolyfills(),
  ],
  external: [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {}),
  ],
};
