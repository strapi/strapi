import { baseConfig } from '../../../rollup.utils.mjs';

export default baseConfig({
  input: {
    index: './src/index.ts',
    'utils/index': './src/utils/index.ts',
  },
  outDir: './dist',
  rootDir: './src',
});
