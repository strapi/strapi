import { defineConfig, mergeConfig } from 'vitest/config';
import { unitPreset } from 'vitest-config/presets/unit';

export default mergeConfig(
  unitPreset,
  defineConfig({
    test: {
      root: __dirname,
    },
  })
);
