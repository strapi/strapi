import { baseConfig } from '../../../rollup.utils.mjs';

export default baseConfig({
  input: {
    index: './src/index.ts',
    cli: './src/cli/index.ts',
    admin: './src/admin.ts',
    'admin-test': './src/admin-test.ts',
  },
});
