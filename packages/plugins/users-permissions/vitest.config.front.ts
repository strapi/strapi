import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    name: 'Users & Permissions admin',
    globals: false,
    server: { deps: { inline: [/@strapi\//] } },
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: 'http://localhost:1337/admin' } },
    include: ['admin/src/**/*.test.{js,jsx,ts,tsx}'],
    setupFiles: ['./admin/tests/setup.ts'],
    env: { ADMIN_PATH: '/admin', TZ: 'UTC', LANG: 'en_US.UTF-8' },
    coverage: { include: ['admin/src/**/*.{js,jsx,ts,tsx}'], exclude: ['**/tests/**'] },
  },
});
