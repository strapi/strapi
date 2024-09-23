/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { builtinModules } from 'node:module';
import dts from 'vite-plugin-dts';

import pkg from './package.json';

/**
 * TODO: we should have `pack-up` handle this for us, but time constaints
 * have meant i've fallen back to vite or a fast solution.
 *
 * https://strapi-inc.atlassian.net/browse/CONTENT-2341
 */
export default defineConfig({
  build: {
    emptyOutDir: false,
    target: 'esnext',
    outDir: 'dist/admin',
    sourcemap: true,
    minify: false,
    lib: {
      // Could also be a dictionary or array of multiple entry points
      entry: {
        index: './admin/src/index.ts',
        ee: './admin/src/ee.ts',
        test: './admin/tests/index.ts',
      },
    },
    rollupOptions: {
      external(id) {
        const external = [
          ...(pkg.dependencies ? Object.keys(pkg.dependencies) : []),
          ...(pkg.peerDependencies ? Object.keys(pkg.peerDependencies) : []),
        ];

        const idParts = id.split('/');

        const name = idParts[0].startsWith('@') ? `${idParts[0]}/${idParts[1]}` : idParts[0];

        const builtinModulesWithNodePrefix = [
          ...builtinModules,
          ...builtinModules.map((modName) => `node:${modName}`),
        ];

        if (
          (name && external.includes(name)) ||
          (name && builtinModulesWithNodePrefix.includes(name))
        ) {
          return true;
        }

        return false;
      },
      output: {
        interop: 'auto',
      },
    },
  },
  plugins: [
    dts({
      outDir: './dist',
      tsconfigPath: './admin/tsconfig.build.json',
    }),
    react(),
  ],
});
