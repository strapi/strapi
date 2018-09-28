const container = require('markdown-it-container')

module.exports = {
  markdown: {
    anchor: {
      permalink: false,
    },
    config: md => {
      md
        .use(require('markdown-it-decorate'))
        .use(...createContainer('intro'))
    }
  },
  title: 'Strapi Docs',
  description: 'API creation made simple, secure and fast.',
  themeConfig: {
    versions: [
      ['Version 3.x.x', '/3.x.x/'],
      ['Version 1.x.x', '/1.x.x/'],
    ],
    repo: 'strapi/strapi',
    docsDir: 'docs',
    editLinks: true,
    editLinkText: 'Improve this page',
    // base: '/',
    // host: 'localhost',
    serviceWorker: true,
    sidebar: {
      '/3.x.x/': [
        {
          collapsable: false,
          title: 'UsefulLinks',
          children: [
            ['/3.x.x/', 'Introduction'],
            ['https://strapi.io', 'Strapi Website'],
            ['https://github.com/strapi/strapi', 'GitHub Repository'],
            ['https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md', 'Contribution Guide'],
          ],
        },
        {
          collapsable: false,
          title: 'Advanced',
          children: [
            '/3.x.x/advanced/customize-admin',
            '/3.x.x/advanced/hooks',
            '/3.x.x/advanced/logging',
            '/3.x.x/advanced/middlewares',
            '/3.x.x/advanced/usage-tracking',
          ],
        },
        '/3.x.x/api-reference/reference',
        '/3.x.x/cli/CLI',
        '/3.x.x/concepts/concepts',
        '/3.x.x/configurations/configurations',
        {
          collapsable: false,
          title: 'Getting started',
          children: ['/3.x.x/getting-started/installation', '/3.x.x/getting-started/quick-start'],
        },
        {
          collapsable: false,
          title: 'Guides',
          children: [
            '/3.x.x/guides/authentication',
            '/3.x.x/guides/controllers',
            '/3.x.x/guides/deployment',
            '/3.x.x/guides/email',
            '/3.x.x/guides/filters',
            '/3.x.x/guides/graphql',
            '/3.x.x/guides/i18n',
            '/3.x.x/guides/models',
            '/3.x.x/guides/policies',
            '/3.x.x/guides/public-assets',
            '/3.x.x/guides/requests',
            '/3.x.x/guides/requests',
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
            ['https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md', 'Contribution Guide'],
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
}

function createContainer(className) {
  return [container, className, {
    render(tokens, idx) {
      const token = tokens[idx]
      if (token.nesting === 1) {
        return `<div class="${className} custom-block">\n`
      } else {
        return `</div>\n`
      }
    }
  }]
}
