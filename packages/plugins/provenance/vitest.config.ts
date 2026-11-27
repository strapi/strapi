/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig, mergeConfig } from 'vitest/config';
// @ts-expect-error - Vitest config uses bundler resolution
import { unitPreset } from 'vitest-config/presets/unit';

export default mergeConfig(
  unitPreset,
  defineConfig({
    test: {
      root: __dirname,
    },
  })
);
