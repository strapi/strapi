import { defineConfig } from 'rollup';
import { baseConfig } from '../../rollup.utils.mjs';

export default defineConfig({
  ...baseConfig(import.meta.dirname),
  input: {
    index: import.meta.dirname + '/src/index.ts',
    'after-env': import.meta.dirname + '/src/after-env.ts',
    environment: import.meta.dirname + '/src/environment.ts',
    'file-mock': import.meta.dirname + '/src/file-mock.ts',
    'global-setup': import.meta.dirname + '/src/global-setup.ts',
    setup: import.meta.dirname + '/src/setup.ts',
  },
});
