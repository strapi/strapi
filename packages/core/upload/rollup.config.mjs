import { defineConfig } from 'rollup';

import { baseConfig, basePluginConfig } from '../../../rollup.utils.mjs';

export default defineConfig([
  ...basePluginConfig(),
  baseConfig({
    input: {
      index: './shared/index.ts',
    },
    outDir: './dist/shared',
  }),
]);
