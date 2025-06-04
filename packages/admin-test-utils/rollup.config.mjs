import { baseConfig } from '../../rollup.utils.mjs';

export default baseConfig({
  input: {
    index: './src/index.ts',
    'after-env': './src/after-env.ts',
    environment: './src/environment.ts',
    'file-mock': './src/file-mock.ts',
    'global-setup': './src/global-setup.ts',
    setup: './src/setup.ts',
  },
});
