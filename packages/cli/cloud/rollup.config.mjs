import { baseConfig } from '../../../rollup.utils.mjs';

export default baseConfig({
  input: {
    index: './src/index.ts',
    bin: './src/bin.ts',
  },
  rootDir: './src',
});
