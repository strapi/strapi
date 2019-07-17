module.exports = [
  {
    collapsable: false,
    title: '🚀 Getting started',
    children: [
      '/3.0.0-alpha.x/getting-started/introduction',
      '/3.0.0-alpha.x/getting-started/install-requirements',
      '/3.0.0-alpha.x/getting-started/quick-start',
      '/3.0.0-alpha.x/getting-started/quick-start-tutorial',
    ],
  },
  {
    collapsable: true,
    title: '💡 Guides',
    children: [
      '/3.0.0-alpha.x/concepts/concepts',
      '/3.0.0-alpha.x/guides/api-documentation',
      '/3.0.0-alpha.x/guides/authentication',
      '/3.0.0-alpha.x/configurations/configurations',
      '/3.0.0-alpha.x/guides/controllers',
      '/3.0.0-alpha.x/guides/databases',
      '/3.0.0-alpha.x/guides/deployment',
      '/3.0.0-alpha.x/guides/email',
      '/3.0.0-alpha.x/guides/upload',
      '/3.0.0-alpha.x/guides/filters',
      '/3.0.0-alpha.x/guides/graphql',
      '/3.0.0-alpha.x/guides/i18n',
      '/3.0.0-alpha.x/guides/models',
      '/3.0.0-alpha.x/guides/policies',
      '/3.0.0-alpha.x/guides/public-assets',
      '/3.0.0-alpha.x/guides/requests',
      '/3.0.0-alpha.x/guides/responses',
      '/3.0.0-alpha.x/guides/routing',
      '/3.0.0-alpha.x/guides/services',
      '/3.0.0-alpha.x/guides/webhooks',
    ],
  },
  {
    collapsable: true,
    title: '⚙️️ Advanced',
    children: [
      '/3.0.0-alpha.x/advanced/customize-admin',
      '/3.0.0-alpha.x/advanced/hooks',
      '/3.0.0-alpha.x/advanced/logging',
      '/3.0.0-alpha.x/advanced/middlewares',
      '/3.0.0-alpha.x/advanced/usage-information',
    ],
  },
  {
    collapsable: true,
    title: '🔌 Plugin Development',
    children: [
      '/3.0.0-alpha.x/plugin-development/quick-start',
      '/3.0.0-alpha.x/plugin-development/plugin-architecture',
      '/3.0.0-alpha.x/plugin-development/backend-development',
      '/3.0.0-alpha.x/plugin-development/frontend-development',
      '/3.0.0-alpha.x/plugin-development/frontend-use-cases',
      '/3.0.0-alpha.x/plugin-development/utils',
      // '/3.0.0-alpha.x/plugin-development/ui-components', TODO: Add this file
    ],
  },
  {
    collapsable: true,
    title: '💻 Command Line Interface',
    children: ['/3.0.0-alpha.x/cli/CLI'],
  },
  {
    collapsable: true,
    title: '🏗 API Reference',
    children: ['/3.0.0-alpha.x/api-reference/reference'],
  },
  {
    collapsable: false,
    title: '📚 Resources',
    children: [
      [
        'https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md',
        'Contributing guide',
      ],
      '/3.0.0-alpha.x/migration-guide/',
      '/3.0.0-alpha.x/articles/',
    ],
  },
];