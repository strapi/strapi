import { defineConfig, mergeConfig } from 'vitest/config';
import { unitPreset } from 'vitest-config/presets/unit';

export default mergeConfig(
  unitPreset,
  defineConfig({
    test: {
      name: 'Typescript utils',
      root: __dirname,
      include: ['**/*.test.ts'],
    },
  })
);
