const container = require('markdown-it-container');

const ogprefix = 'og: http://ogp.me/ns#';
const title = 'Strapi Documentation';
const description = 'The headless CMS developers love.';
const color = '#2F80ED';
const author = 'Strapi';
const url = 'https://strapi.io/documentation/';

module.exports = {
  head: [
    ['link', { rel: 'icon', href: `/rocket.png` }],
    ['meta', { name: 'theme-color', content: color }],
    ['meta', { prefix: ogprefix, property: 'og:title', content: title }],
    ['meta', { prefix: ogprefix, property: 'twitter:title', content: title }],
    ['meta', { prefix: ogprefix, property: 'og:type', content: 'article' }],
    ['meta', { prefix: ogprefix, property: 'og:url', content: url }],
    [
      'meta',
      { prefix: ogprefix, property: 'og:description', content: description },
    ],
    [
      'meta',
      { prefix: ogprefix, property: 'og:image', content: `${url}rocket.png` },
    ],
    [
      'meta',
      { prefix: ogprefix, property: 'og:article:author', content: author },
    ],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    [
      'meta',
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black' },
    ],
    // ['link', { rel: 'apple-touch-icon', href: `/assets/apple-touch-icon.png` }],
    // ['link', { rel: 'mask-icon', href: '/assets/safari-pinned-tab.svg', color: color }],
    ['meta', { name: 'msapplication-TileImage', content: '/rocket.png' }],
    ['meta', { name: 'msapplication-TileColor', content: color }],
  ],
  markdown: {
    anchor: {
      permalink: true,
    },
    config: md => {
      md.use(require('markdown-it-decorate'))
        .use(...createContainer('intro'))
        .use(...createContainer('windows'))
        .use(...createContainer('ubuntu'))
        .use(...createContainer('mac'))
        .use(...createContainer('note'));
      const vuepressTabs = require('vuepress-tabs');
      vuepressTabs(md);
    },
  },
  title,
  description,
  base: '/documentation/',
  ga: 'UA-54313258-1',
  themeConfig: {
    versions: [
      ['Version 3.0.0-beta.x', '/3.0.0-beta.x/'],
      ['Version 3.0.0-alpha.x', '/3.0.0-alpha.x/'],
      ['Version 1.x.x', '/1.x.x/'],
    ],
    repo: 'strapi/strapi',
    website: 'https://strapi.io',
    docsDir: 'docs',
    editLinks: true,
    editLinkText: 'Improve this page',
    serviceWorker: true,
    hiddenLinks: [
      '/3.0.0-beta.x/cli/CLI.html',
      '/3.0.0-beta.x/api-reference/reference.html',
    ],
    sidebar: {
      '/3.0.0-beta.x/': [
        {
          collapsable: false,
          title: '🚀 Getting started',
          children: [
            '/3.0.0-beta.x/getting-started/introduction',
            '/3.0.0-beta.x/getting-started/install-requirements',
            '/3.0.0-beta.x/getting-started/quick-start',
            '/3.0.0-beta.x/getting-started/quick-start-tutorial',
          ],
        },
        {
          collapsable: true,
          title: '💡 Guides',
          children: [
            '/3.0.0-beta.x/concepts/concepts',
            '/3.0.0-beta.x/guides/api-documentation',
            '/3.0.0-beta.x/guides/authentication',
            '/3.0.0-beta.x/configurations/configurations',
            '/3.0.0-beta.x/guides/controllers',
            '/3.0.0-beta.x/guides/databases',
            '/3.0.0-beta.x/guides/deployment',
            '/3.0.0-beta.x/guides/email',
            '/3.0.0-beta.x/guides/upload',
            '/3.0.0-beta.x/guides/filters',
            '/3.0.0-beta.x/guides/graphql',
            '/3.0.0-beta.x/guides/i18n',
            '/3.0.0-beta.x/guides/models',
            '/3.0.0-beta.x/guides/policies',
            '/3.0.0-beta.x/guides/public-assets',
            '/3.0.0-beta.x/guides/requests',
            '/3.0.0-beta.x/guides/responses',
            '/3.0.0-beta.x/guides/routing',
            '/3.0.0-beta.x/guides/services',
            '/3.0.0-beta.x/guides/queries',
            '/3.0.0-beta.x/guides/webhooks',
          ],
        },
        {
          collapsable: true,
          title: '⚙️️ Advanced',
          children: [
            '/3.0.0-beta.x/advanced/customize-admin',
            '/3.0.0-beta.x/advanced/hooks',
            '/3.0.0-beta.x/advanced/logging',
            '/3.0.0-beta.x/advanced/middlewares',
            '/3.0.0-beta.x/advanced/usage-information',
          ],
        },
        {
          collapsable: true,
          title: '🔌 Local plugins',
          children: [
            '/3.0.0-beta.x/plugin-development/quick-start',
            '/3.0.0-beta.x/plugin-development/plugin-architecture',
            '/3.0.0-beta.x/plugin-development/backend-development',
            '/3.0.0-beta.x/plugin-development/frontend-development',

            // '/3.0.0-beta.x/plugin-development/ui-components', TODO: Add this file
          ],
        },
        {
          collapsable: true,
          title: '💻 Command Line Interface',
          children: ['/3.0.0-beta.x/cli/CLI'],
        },
        {
          collapsable: true,
          title: '🏗 API Reference',
          children: ['/3.0.0-beta.x/api-reference/reference'],
        },
        {
          collapsable: false,
          title: '📚 Resources',
          children: [
            [
              'https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md',
              'Contributing guide',
            ],
            '/3.0.0-beta.x/migration-guide/',
            '/3.0.0-beta.x/articles/',
          ],
        },
      ],
      '/3.0.0-alpha.x/': [
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
      ],
      '/1.x.x/': [
        {
          collapsable: false,
          title: 'UsefulLinks',
          children: [
            ['/1.x.x/', 'Introduction'],
            ['https://strapi.io', 'Strapi Website'],
            ['https://github.com/strapi/strapi', 'GitHub Repository'],
            [
              'https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md',
              'Contribution Guide',
            ],
          ],
        },
        '/1.x.x/admin.md',
        '/1.x.x/configuration.md',
        '/1.x.x/email.md',
        '/1.x.x/introduction.md',
        '/1.x.x/queries.md',
        '/1.x.x/response.md',
        '/1.x.x/sessions.md',
        '/1.x.x/testing.md',
        '/1.x.x/views.md',
        '/1.x.x/blueprints.md',
        '/1.x.x/context.md',
        '/1.x.x/graphql.md',
        '/1.x.x/logging.md',
        '/1.x.x/router.md',
        '/1.x.x/upload.md',
        '/1.x.x/cli.md',
        '/1.x.x/customization.md',
        '/1.x.x/internationalization.md',
        '/1.x.x/models.md',
        '/1.x.x/request.md',
        '/1.x.x/services.md',
        '/1.x.x/users.md',
      ],
    },
  },
};

function createContainer(className) {
  return [
    container,
    className,
    {
      render(tokens, idx) {
        const token = tokens[idx];
        if (token.nesting === 1) {
          return `<div class="${className} custom-block">\n`;
        } else {
          return `</div>\n`;
        }
      },
    },
  ];
}
