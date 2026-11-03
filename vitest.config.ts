import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // tests/utils holds the e2e runner and helpers, which no package owns.
    projects: ['packages/**/vitest*.config.*', 'tests/utils/vitest.config.ts'],
    // Enabled via the `--coverage` CLI flag. The lcov.info report is uploaded to SonarQube in CI.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcovonly'],
    },
  },
});
