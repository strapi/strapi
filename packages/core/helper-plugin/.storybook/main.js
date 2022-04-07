module.exports = {
  stories: [
    '../*.stories.mdx',
    '../lib/src/**/*.stories.mdx',
    '../lib/src/**/*.stories.@(js|jsx|ts|tsx)',

    // Temporarily in order to test the SelectTree
    '../../upload/admin/src/**/*.stories.mdx',
  ],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials'],
  core: {
    builder: 'webpack5',
  },
};
