import { baseConfig } from '../../../rollup.utils.mjs';

export default baseConfig({
  input: './src/index.ts',
  outDir: './dist',
  rootDir: './src',
});
