module.exports = {
  title: null,
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
        href: 'https://strapi.io/assets/favicon-32x32.png',
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
        content: 'https://strapi.io/documentation/assets/meta.png',
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
    logo: '/assets/logo.png',
    nav: [
      {
        text: 'Versions',
        items: [
          {
            text: 'Version 3.x',
            link: '/v3.x/',
          },
          {
            text: 'Version 3.0.0-beta.x',
            link: '/3.0.0-beta.x/',
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
        link: 'https://strapi.io/blog',
      },
      {
        text: 'Tutorials',
        link: 'https://strapi.io/tutorials',
      },
    ],
    repo: 'strapi/strapi',
    docsDir: 'docs',
    docsBranch: 'documentation',
    algolia: {
      apiKey: 'a93451de224096fb34471c8b8b049de7',
      indexName: 'strapi',
    },
    editLinks: true,
    editLinkText: 'Improve this page',
    serviceWorker: true,
    sidebarDepth: 1,
    sidebar: {
      '/v3.x/': [
        {
          collapsable: false,
          title: '🚀 Getting Started',
          children: [
            ['/v3.x/getting-started/introduction', 'Introduction'],
            ['/v3.x/getting-started/installation', 'Installation'],
            ['/v3.x/getting-started/deployment', 'Deployment'],
            ['/v3.x/getting-started/contributing', 'Contributing'],
            ['/v3.x/getting-started/troubleshooting', 'Troubleshooting'],
            ['/v3.x/getting-started/usage-information', 'Telemetry'],
            '/v3.x/getting-started/quick-start',
          ],
        },
        {
          collapsable: true,
          title: '📄 Content API',
          children: [
            ['/v3.x/content-api/api-endpoints', 'API Endpoints'],
            ['/v3.x/content-api/parameters', 'Parameters'],
            ['/v3.x/content-api/integrations', 'Integrations'],
          ],
        },
        {
          collapsable: true,
          title: '💡 Concepts',
          children: [
            '/v3.x/concepts/configurations',
            '/v3.x/concepts/controllers',
            '/v3.x/concepts/customization',
            '/v3.x/concepts/file-structure',
            '/v3.x/concepts/hooks',
            '/v3.x/concepts/middlewares',
            '/v3.x/concepts/models',
            '/v3.x/concepts/plugins',
            '/v3.x/concepts/policies',
            '/v3.x/concepts/public-assets',
            '/v3.x/concepts/queries',
            '/v3.x/concepts/requests-responses',
            '/v3.x/concepts/routing',
            '/v3.x/concepts/services',
            '/v3.x/concepts/webhooks',
          ],
        },
        {
          collapsable: true,
          title: '📚 Guides',
          children: [
            '/v3.x/guides/api-token',
            '/v3.x/guides/auth-request',
            '/v3.x/guides/count-graphql',
            '/v3.x/guides/slug',
            '/v3.x/guides/is-owner',
            '/v3.x/guides/custom-admin',
            '/v3.x/guides/custom-data-response',
            '/v3.x/guides/databases',
            '/v3.x/guides/draft',
            '/v3.x/guides/error-catching',
            '/v3.x/guides/external-data',
            '/v3.x/guides/jwt-validation',
            '/v3.x/guides/process-manager',
            '/v3.x/guides/scheduled-publication',
            '/v3.x/guides/secure-your-app',
            '/v3.x/guides/send-email',
            '/v3.x/guides/registering-a-field-in-admin',
            '/v3.x/guides/client',
            '/v3.x/guides/update-version',
            '/v3.x/guides/unit-testing',
          ],
        },
        {
          collapsable: true,
          title: '⚙️️ Admin Panel',
          children: [
            '/v3.x/admin-panel/customization',
            '/v3.x/admin-panel/custom-webpack-config',
            '/v3.x/admin-panel/deploy',
            '/v3.x/admin-panel/forgot-password',
          ],
        },
        {
          collapsable: true,
          title: '📦 Plugins',
          children: [
            '/v3.x/plugins/documentation',
            '/v3.x/plugins/email',
            '/v3.x/plugins/graphql',
            '/v3.x/plugins/upload',
            '/v3.x/plugins/users-permissions',
          ],
        },
        {
          collapsable: true,
          title: '🔌 Local Plugins',
          children: [
            '/v3.x/plugin-development/quick-start',
            '/v3.x/plugin-development/plugin-architecture',
            '/v3.x/plugin-development/backend-development',
            '/v3.x/plugin-development/frontend-development',
            '/v3.x/plugin-development/frontend-field-api',
            '/v3.x/plugin-development/frontend-settings-api',
          ],
        },
        {
          collapsable: true,
          title: '💻 Command Line Interface',
          children: ['/v3.x/cli/CLI'],
        },
        {
          collapsable: true,
          title: '🏗 Global strapi',
          children: ['/v3.x/global-strapi/api-reference'],
        },
        {
          collapsable: false,
          title: '📚 Resources',
          children: [
            ['https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md', 'Contributing guide'],
            '/v3.x/migration-guide/',
          ],
        },
      ],
      '/3.0.0-beta.x/': [
        {
          collapsable: false,
          title: '🚀 Getting Started',
          children: [
            ['/3.0.0-beta.x/getting-started/introduction', 'Introduction'],
            ['/3.0.0-beta.x/getting-started/installation', 'Installation'],
            ['/3.0.0-beta.x/getting-started/deployment', 'Deployment'],
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
            '/3.0.0-beta.x/concepts/configurations',
            '/3.0.0-beta.x/concepts/controllers',
            '/3.0.0-beta.x/concepts/customization',
            '/3.0.0-beta.x/concepts/file-structure',
            '/3.0.0-beta.x/concepts/hooks',
            '/3.0.0-beta.x/concepts/middlewares',
            '/3.0.0-beta.x/concepts/models',
            '/3.0.0-beta.x/concepts/plugins',
            '/3.0.0-beta.x/concepts/policies',
            '/3.0.0-beta.x/concepts/public-assets',
            '/3.0.0-beta.x/concepts/queries',
            '/3.0.0-beta.x/concepts/requests-responses',
            '/3.0.0-beta.x/concepts/routing',
            '/3.0.0-beta.x/concepts/services',
            '/3.0.0-beta.x/concepts/webhooks',
          ],
        },
        {
          collapsable: true,
          title: '📚 Guides',
          children: [
            '/3.0.0-beta.x/guides/api-token',
            '/3.0.0-beta.x/guides/auth-request',
            '/3.0.0-beta.x/guides/count-graphql',
            '/3.0.0-beta.x/guides/slug',
            '/3.0.0-beta.x/guides/is-owner',
            '/3.0.0-beta.x/guides/custom-admin',
            '/3.0.0-beta.x/guides/custom-data-response',
            '/3.0.0-beta.x/guides/databases',
            '/3.0.0-beta.x/guides/draft',
            '/3.0.0-beta.x/guides/error-catching',
            '/3.0.0-beta.x/guides/external-data',
            '/3.0.0-beta.x/guides/jwt-validation',
            '/3.0.0-beta.x/guides/process-manager',
            '/3.0.0-beta.x/guides/scheduled-publication',
            '/3.0.0-beta.x/guides/secure-your-app',
            '/3.0.0-beta.x/guides/send-email',
            '/3.0.0-beta.x/guides/registering-a-field-in-admin',
            '/3.0.0-beta.x/guides/client',
            '/3.0.0-beta.x/guides/update-version',
          ],
        },
        {
          collapsable: true,
          title: '⚙️️ Admin Panel',
          children: [
            '/3.0.0-beta.x/admin-panel/customization',
            '/3.0.0-beta.x/admin-panel/custom-webpack-config',
            '/3.0.0-beta.x/admin-panel/deploy',
          ],
        },
        {
          collapsable: true,
          title: '📦 Plugins',
          children: [
            '/3.0.0-beta.x/plugins/documentation',
            '/3.0.0-beta.x/plugins/email',
            '/3.0.0-beta.x/plugins/graphql',
            '/3.0.0-beta.x/plugins/upload',
            '/3.0.0-beta.x/plugins/users-permissions',
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
            '/3.0.0-beta.x/plugin-development/frontend-field-api',
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
    },
  },
};
