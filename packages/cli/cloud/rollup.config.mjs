import { defineConfig } from 'rollup';
import { baseConfig } from '../../../rollup.utils.mjs';

export default defineConfig({
  ...baseConfig(import.meta.dirname),
  input: {
    index: './src/index.ts',
    bin: './src/bin.ts',
  },
});
