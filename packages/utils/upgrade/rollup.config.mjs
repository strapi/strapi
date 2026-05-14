import { baseConfig } from '../../../rollup.utils.mjs';

export default baseConfig({
  input: {
    index: './src/index.ts',
    cli: './src/cli/index.ts',
  },
});
