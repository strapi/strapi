import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: ['packages/**/vitest*.config.*'],
    // Enabled via the `--coverage` CLI flag. The lcov report is uploaded to SonarQube in CI.
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
    },
  },
});
