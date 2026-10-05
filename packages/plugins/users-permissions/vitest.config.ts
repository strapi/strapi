import { defineConfig, mergeConfig } from 'vitest/config';
import { unitPreset } from 'vitest-config/presets/unit';

export default mergeConfig(
  unitPreset,
  defineConfig({
    test: {
      name: 'users-permissions-server',
      root: __dirname,
      include: ['server/**/*.test.{js,ts}'],
      coverage: {
        provider: 'v8',
        include: ['server/src/**/*.ts'],
        exclude: ['**/__tests__/**', '**/*.test.ts'],
      },
    },
  })
);
