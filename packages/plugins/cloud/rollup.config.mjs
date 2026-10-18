import { baseConfig } from '../../../rollup.utils.mjs';

export default baseConfig({
  input: {
    index: './admin/src/index.ts',
  },
  rootDir: './admin/src',
  outDir: './dist/admin',
});
