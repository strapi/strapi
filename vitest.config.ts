import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/**/vitest*.config.*',
      // users-permissions runs its suites through its own Nx test:unit and test:front targets.
      '!packages/plugins/users-permissions/vitest*.config.*',
      // tests/utils holds the e2e runner and helpers, which no package owns.
      'tests/utils/vitest.config.ts',
    ],
    // Enabled via the `--coverage` CLI flag. The lcov.info report is uploaded to SonarQube in CI.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcovonly'],
    },
  },
});
