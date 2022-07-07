module.exports = {
  stories: [
    '../*.stories.mdx',
    '../../../packages/core/**/admin/src/**/*.stories.mdx',
    '../../../packages/core/**/admin/src/**/*.stories.@(js|jsx|ts|tsx)',
    '../../../packages/plugins/**/admin/src/**/*.stories.mdx',
    '../../../packages/plugins/**/admin/src/**/*.stories.@(js|jsx|ts|tsx)',
  ],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
  ],
  framework: '@storybook/react',
};
