import type { StorybookConfig } from '@storybook/react-vite';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { dirname, join } from 'path';
import { mergeConfig } from 'vite';

const config: StorybookConfig = {
  stories: ['../*.stories.mdx', '../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],

  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('@storybook/addon-mdx-gfm'),
  ],

  core: {
    builder: '@storybook/builder-vite',
  },

  typescript: {
    check: false,
  },

  framework: {
    name: getAbsolutePath('@storybook/react-vite'),
    options: {},
  },

  docs: {
    autodocs: true,
  },

  async viteFinal(config) {
    // Merge custom configuration into the default config
    return mergeConfig(config, {
      /**
       * This is required to support the import from "@strapi/design-system/v2"
       */
      plugins: [nodeResolve()],
    });
  },
};

function getAbsolutePath<T extends string>(value: T): T {
  return dirname(require.resolve(join(value, 'package.json'))) as T;
}

export default config;
