import { baseConfig } from '../../../rollup.utils.mjs';

export default baseConfig({
  input: {
    index: './admin/src/index.ts',
  },
  outDir: './dist/admin',
});
