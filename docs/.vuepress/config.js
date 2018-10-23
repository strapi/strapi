const container = require('markdown-it-container')

let ogprefix = 'og: http://ogp.me/ns#'
let title = 'Strapi Documentation'
let description = 'API creation made simple, secure and fast.'
let color = '#2F80ED'
let author = 'Strapi'
let url = 'https://strapi.io/documentation/'


module.exports = {
  head: [
    ['link', { rel: 'icon', href: `/rocket.png` }],
    ['meta', { name: 'theme-color', content: color }],
    ['meta', { prefix: ogprefix, property: 'og:title', content: title }],
    ['meta', { prefix: ogprefix, property: 'twitter:title', content: title }],
    ['meta', { prefix: ogprefix, property: 'og:type', content: 'article' }],
    ['meta', { prefix: ogprefix, property: 'og:url', content: url }],
    ['meta', { prefix: ogprefix, property: 'og:description', content: description }],
    ['meta', { prefix: ogprefix, property: 'og:image', content: `${url}rocket.png` }],
    ['meta', { prefix: ogprefix, property: 'og:article:author', content: author }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black' }],
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
      md
        .use(require('markdown-it-decorate'))
        .use(...createContainer('intro'))
        .use(...createContainer('note'))
    }
  },
  title,
  description,
  base: '/documentation/',
  ga: 'UA-54313258-1',
  themeConfig: {
    versions: [
      ['Version 3.x.x', '/3.x.x/'],
      ['Version 1.x.x', '/1.x.x/'],
    ],
    repo: 'strapi/strapi',
    docsDir: 'docs',
    editLinks: true,
    editLinkText: 'Improve this page',
    serviceWorker: true,
    sidebar: {
      '/3.x.x/': [
        {
          collapsable: false,
          title: 'Getting started',
          children: [
            '/3.x.x/getting-started/installation',
            '/3.x.x/getting-started/quick-start',
            '/3.x.x/concepts/concepts',
          ],
        },
        {
          collapsable: false,
          title: 'Guides',
          children: [
            '/3.x.x/guides/authentication.md',
            '/3.x.x/configurations/configurations.md',
            '/3.x.x/guides/controllers.md',
            '/3.x.x/guides/deployment.md',
            '/3.x.x/guides/email.md',
            '/3.x.x/guides/upload.md',
            '/3.x.x/guides/filters.md',
            '/3.x.x/guides/graphql.md',
            '/3.x.x/guides/i18n.md',
            '/3.x.x/guides/models.md',
            '/3.x.x/guides/policies.md',
            '/3.x.x/guides/public-assets.md',
            '/3.x.x/guides/requests.md',
            '/3.x.x/guides/responses.md',
            '/3.x.x/guides/routing.md',
            '/3.x.x/guides/services.md',
          ],
        },
        {
          collapsable: false,
          title: 'Globals',
          children: [
            '/3.x.x/api-reference/reference',
            '/3.x.x/cli/CLI',
            '/3.x.x/configurations/configurations',
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
        {
          collapsable: false,
          title: 'Resources',
          children: [
            ['https://github.com/strapi/strapi/blob/master/CONTRIBUTING.md', 'Contributing guide'],
            ['https://github.com/strapi/strapi/wiki', 'Migration guides'],
            '/3.x.x/tutorials/',
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
