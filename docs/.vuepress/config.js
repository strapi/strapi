const container = require('markdown-it-container');

const title = 'Strapi Documentation';
const description = 'The headless CMS developers love.';

const head = require('./config/head')({ title, description });
const markdown = require('./config/markdown');

const versions_one = require('./config/versions/1.x.x');
const versions_three_alpha = require('./config/versions/3.0.0-alpha.x');
const versions_three_beta = require('./config/versions/3.0.0-beta.x');

const externals = {
  repo: 'strapi/strapi',
  website: 'https://strapi.io',
  slack: 'https://slack.strapi.io',
  blog: 'https://blog.strapi.io',
};

module.exports = {
  head,
  markdown,
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
    repo: externals.repo,
    website: externals.website,
    slack: externals.slack,
    blog: externals.blog,
    docsDir: 'docs',
    algolia: {
      apiKey: 'a93451de224096fb34471c8b8b049de7',
      indexName: 'strapi',
    },
    editLinks: true,
    editLinkText: 'Improve this page',
    serviceWorker: true,
    hiddenLinks: [
      '/3.0.0-beta.x/cli/CLI.html',
      '/3.0.0-beta.x/api-reference/reference.html',
    ],
    sidebarDepth: 2,
    sidebar: {
      '/3.0.0-beta.x/': versions_three_beta,
      '/3.0.0-alpha.x/': versions_three_alpha,
      '/1.x.x/': versions_one,
    },
  },
};
