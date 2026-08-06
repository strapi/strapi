import { baseConfig } from '../../../rollup.utils.mjs';

export default baseConfig({
  rootDir: './src',
  input: {
    index: './src/index.ts',
    attributes: './src/attributes.ts',
  },
});
