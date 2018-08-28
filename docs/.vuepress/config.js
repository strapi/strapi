module.exports = {
  themeConfig: {
    sidebar: [
      '/3.x.x/en/',
      {
        title: 'advanced',
        children: [
          '/3.x.x/en/advanced/customize-admin',
          '/3.x.x/en/advanced/hooks',
          '/3.x.x/en/advanced/logging',
          '/3.x.x/en/advanced/middlewares',
          '/3.x.x/en/advanced/usage-tracking',
        ]
      },
      {
        title: 'api-reference',
        children: [
          '/3.x.x/en/api-reference/reference',
        ]
      },
      '/3.x.x/en/cli/CLI',
      '/3.x.x/en/concepts/concepts',
      '/3.x.x/en/configurations/configurations',
      {
        title: 'Getting started',
        children: [
          '/3.x.x/en/getting-started/installation',
          '/3.x.x/en/getting-started/quick-start',
        ]
      },
      {
        title: 'Guides',
        children: [
          '/3.x.x/en/guides/authentication',
          '/3.x.x/en/guides/controllers',
          '/3.x.x/en/guides/deployment',
          '/3.x.x/en/guides/email',
          '/3.x.x/en/guides/filters',
          '/3.x.x/en/guides/graphql',
          '/3.x.x/en/guides/i18n',
          '/3.x.x/en/guides/models',
          '/3.x.x/en/guides/policies',
          '/3.x.x/en/guides/public-assets',
          '/3.x.x/en/guides/requests',
          '/3.x.x/en/guides/requests',
        ]
      },
    ],
  },
}
