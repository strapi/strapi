import path from 'node:path';

import { defineConfig } from 'vitest/config';

/**
 * Same conventions as the repo's unit preset (vitest-config): explicit imports from 'vitest',
 * node environment. Each test file starts its own Strapi app, hence the long timeouts.
 */
export default defineConfig({
  test: {
    root: __dirname,
    include: ['tests/**/*.cli-test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 60_000,
    hookTimeout: 180_000,
    watch: false,
    // In CI, a JUnit report next to the generated apps, uploaded as an artifact.
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: {
      junit: path.join(__dirname, '../../test-apps/next/reports/junit/cli.xml'),
    },
  },
});
