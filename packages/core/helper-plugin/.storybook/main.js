module.exports = {
  stories: [
    '../*.stories.mdx',
    '../lib/src/**/*.stories.mdx',
    '../lib/src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials'],
  core: {
    builder: 'webpack5',
  },
};
