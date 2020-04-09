module.exports = {
  title: 'Strapi Documentation',
  description: 'The headless CMS developers love.',
  base: '/documentation/',
  plugins: [
    '@vuepress/medium-zoom',
    'vuepress-plugin-element-tabs',
    [
      '@vuepress/google-analytics',
      {
        ga: 'UA-54313258-1',
      },
    ],
  ],
  head: [
    [
      'link',
      {
        rel: 'icon',
        href: 'https://strapi.io/favicon.ico',
      },
    ],

    [
      'meta',
      {
        property: 'og:title',
        content: 'Strapi Documentation',
      },
    ],
    [
      'meta',
      {
        property: 'og:type',
        content: 'article',
      },
    ],
    [
      'meta',
      {
        property: 'og:url',
        content: 'https://strapi.io/documentation/',
      },
    ],
    [
      'meta',
      {
        property: 'og:description',
        content: 'The headless CMS developers love.',
      },
    ],
    [
      'meta',
      {
        property: 'og:image',
        content: 'https://strapi.io/assets/images/strapi-website-preview.png',
      },
    ],
    [
      'meta',
      {
        property: 'og:article:author',
        content: 'strapi',
      },
    ],

    [
      'meta',
      {
        property: 'twitter:card',
        content: 'summary_large_image',
      },
    ],
    [
      'meta',
      {
        property: 'twitter:url',
        content: 'https://strapi.io/documentation/',
      },
    ],
    [
      'meta',
      {
        property: 'twitter:site',
        content: '@strapijs',
      },
    ],
    [
      'meta',
      {
        property: 'twitter:title',
        content: 'Strapi Documentation',
      },
    ],
    [
      'meta',
      {
        property: 'twitter:description',
        content: 'The headless CMS developers love.',
      },
    ],
    [
      'meta',
      {
        property: 'twitter:image',
        content: 'http://strapi.io/assets/images/strapi-website-preview.png',
      },
    ],
  ],
  themeConfig: {
    nav: [
      {
        text: 'Versions',
        items: [
          {
            text: 'Version 3.0.0-beta.x',
            link: '/3.0.0-beta.x/',
          },
          {
            text: 'Version 3.0.0-alpha.x',
            link: '/3.0.0-alpha.x/',
          },
        ],
      },
      {
        text: 'Website',
        link: 'https://strapi.io',
      },
      {
        text: 'Slack',
        link: 'https://slack.strapi.io',
      },
      {
        text: 'Blog',
        link: 'https://blog.strapi.io',
      },
    ],
    repo: 'strapi/strapi',
    docsDir: 'docs',
    algolia: {
      apiKey: 'a93451de224096fb34471c8b8b049de7',
      indexName: 'strapi',
    },
    editLinks: true,
    editLinkText: 'Improve this page',
    serviceWorker: true,
    sidebarDepth: 1,
    sidebar: {
      '/3.0.0-beta.x/': [
        {
          collapsable: false,
          title: '🚀 Getting Started',
          children: [
            ['/3.0.0-beta.x/getting-started/introduction', 'Introduction'],
            ['/3.0.0-beta.x/getting-started/installation', 'Installation'],
            ['/3.0.0-beta.x/getting-started/contributing', 'Contributing'],
            ['/3.0.0-beta.x/getting-started/troubleshooting', 'Troubleshooting'],
            '/3.0.0-beta.x/getting-started/quick-start',
            '/3.0.0-beta.x/getting-started/quick-start-tutorial',
          ],
        },
        {
          collapsable: true,
          title: '📄 Content API',
          children: [
            '/3.0.0-beta.x/content-api/api-endpoints',
            '/3.0.0-beta.x/content-api/parameters',
          ],
        },
        {
          collapsable: true,
          title: '💡 Concepts',
          children: [
            '/3.0.0-beta.x/concepts/file-structure',
            '/3.0.0-beta.x/concepts/configurations',
            '/3.0.0-beta.x/concepts/requests-responses',
            '/3.0.0-beta.x/concepts/customization',
            '/3.0.0-beta.x/concepts/routing',
            '/3.0.0-beta.x/concepts/controllers',
            '/3.0.0-beta.x/concepts/models',
            '/3.0.0-beta.x/concepts/services',
            '/3.0.0-beta.x/concepts/queries',
            '/3.0.0-beta.x/concepts/policies',
            '/3.0.0-beta.x/concepts/public-assets',
            '/3.0.0-beta.x/concepts/hooks',
            '/3.0.0-beta.x/concepts/middlewares',
            '/3.0.0-beta.x/concepts/plugins',
            '/3.0.0-beta.x/concepts/webhooks',
          ],
        },
        {
          collapsable: true,
          title: '📚 Guides',
          children: [
            '/3.0.0-beta.x/guides/update-version',
            '/3.0.0-beta.x/guides/databases',
            '/3.0.0-beta.x/guides/deployment',
            '/3.0.0-beta.x/guides/process-manager',
            '/3.0.0-beta.x/guides/jwt-validation',
            '/3.0.0-beta.x/guides/api-token',
            '/3.0.0-beta.x/guides/auth-request',
            '/3.0.0-beta.x/guides/error-catching',
            '/3.0.0-beta.x/guides/secure-your-app',
            '/3.0.0-beta.x/guides/external-data',
            '/3.0.0-beta.x/guides/custom-data-response',
            '/3.0.0-beta.x/guides/custom-admin',
            '/3.0.0-beta.x/guides/client',
            '/3.0.0-beta.x/guides/is-owner',
            '/3.0.0-beta.x/guides/draft',
            '/3.0.0-beta.x/guides/scheduled-publication',
            '/3.0.0-beta.x/guides/slug',
            '/3.0.0-beta.x/guides/send-email',
            '/3.0.0-beta.x/guides/count-graphql',
          ],
        },
        {
          collapsable: true,
          title: '⚙️️ Admin Panel',
          children: ['/3.0.0-beta.x/admin-panel/customization', '/3.0.0-beta.x/admin-panel/deploy'],
        },
        {
          collapsable: true,
          title: '📦 Plugins',
          children: [
            '/3.0.0-beta.x/plugins/users-permissions',
            '/3.0.0-beta.x/plugins/documentation',
            '/3.0.0-beta.x/plugins/email',
            '/3.0.0-beta.x/plugins/upload',
            '/3.0.0-beta.x/plugins/graphql',
          ],
        },
        {
          collapsable: true,
          title: '🔌 Local Plugins',
          children: [
            '/3.0.0-beta.x/plugin-development/quick-start',
            '/3.0.0-beta.x/plugin-development/plugin-architecture',
            '/3.0.0-beta.x/plugin-development/backend-development',
            '/3.0.0-beta.x/plugin-development/frontend-development',
            '/3.0.0-beta.x/plugin-development/frontend-settings-api',
          ],
        },
        {
          collapsable: true,
          title: '💻 Command Line Interface',
          children: ['/3.0.0-beta.x/cli/CLI'],
        },
        {
          collapsable: true,
          title: '🏗 Global strapi',
          children: [
            '/3.0.0-beta.x/global-strapi/api-reference',
            '/3.0.0-beta.x/global-strapi/usage-information',
          ],
        },
        {
          collapsable: false,
          title: '📚 Resources',
          children: [
            ['https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md', 'Contributing guide'],
            '/3.0.0-beta.x/migration-guide/',
          ],
        },
      ],
      '/3.0.0-alpha.x/': [
        {
          collapsable: false,
          title: '🚀 Getting Started',
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
            ['https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md', 'Contributing guide'],
            '/3.0.0-alpha.x/migration-guide/',
            '/3.0.0-alpha.x/articles/',
          ],
        },
      ],
    },
  },
};
