import { resolve } from 'node:path';

import { coverageConfigDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    name: 'users-permissions-admin',
    root: __dirname,
    globals: false,
    server: { deps: { inline: [/@strapi\//] } },
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:1337/admin' } },
    include: ['admin/src/**/*.test.{ts,tsx}'],
    setupFiles: ['./admin/tests/setup.ts'],
    env: { ADMIN_PATH: '/admin', TZ: 'UTC', LANG: 'en_US.UTF-8' },
    // Same budget as the shared Jest front preset these tests ran under before.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    coverage: {
      reporter: [
        ...coverageConfigDefaults.reporter,
        ['lcovonly', { projectRoot: resolve(__dirname, '../../..') }],
      ],
      include: ['admin/src/**/*.{ts,tsx}'],
      exclude: ['**/tests/**'],
    },
  },
});
