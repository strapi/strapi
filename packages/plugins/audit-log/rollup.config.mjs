import { baseConfig } from '../../../rollup.utils.mjs';

export default baseConfig({
  input: {
    index: './server/src/index.ts',
  },
  rootDir: './server/src',
  outDir: './dist/server',
});
