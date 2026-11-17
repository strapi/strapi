import { defineConfig } from 'rollup';

import { baseConfig } from '../../../rollup.utils.mjs';

export default defineConfig([
  baseConfig({
    input: {
      index: './server/src/index.ts',
      // Public entry points re-exported through the `./auth*` package exports
      auth: './server/src/engine/better-auth/public/auth.ts',
      'auth/plugins': './server/src/engine/better-auth/public/plugins.ts',
      'auth/passkey': './server/src/engine/better-auth/public/passkey.ts',
      // Public entry point of provider packages, re-exported through the `./providers` package export
      providers: './server/src/providers/public.ts',
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
