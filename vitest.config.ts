import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/**/vitest*.config.*',
      // users-permissions runs its suites through its own Nx test:unit and test:front targets.
      '!packages/plugins/users-permissions/vitest*.config.*',
    ],
  },
});
