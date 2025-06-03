// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion
const path = require('path');
const {
  themes: { github: lightCodeTheme, dracula: darkCodeTheme },
} = require('prism-react-renderer');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Doc',
  tagline: 'Dinosaurs are cool',
  url: 'https://contributor.strapi.io',
  baseUrl: '/',
  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.png',
  organizationName: 'strapi',
  projectName: 'strapi',
  trailingSlash: false,
  themes: ['@docusaurus/theme-mermaid'],

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  markdown: {
    mermaid: true,
  },
  plugins: [
    () => ({
      name: 'resolve-react',
      configureWebpack() {
        return {
          resolve: {
            alias: {
              react: path.resolve(__dirname, './node_modules/react'),
            },
          },
        };
      },
    }),
    [
      'docusaurus-plugin-typedoc',
      // Plugin / TypeDoc options
      {
        entryPoints: ['../packages/core/strapi/src/admin.ts'],
        tsconfig: '../packages/core/strapi/tsconfig.build.json',
        entryDocument: null,
        out: 'exports',
        watch: process.env.TYPEDOC_WATCH,
      },
    ],
    [
      '@cmfcmf/docusaurus-search-local',
      {
        indexBlog: false,
      },
    ],
  ],
  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/strapi/strapi/tree/main/docs/',
        },
        blog: false,
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    {
      navbar: {
        title: 'Contributor documentation',
        hideOnScroll: true,
        logo: {
          alt: 'Doc',
          src: 'img/logo.svg',
          srcDark: 'img/logo_dark.svg',
          width: 100,
        },
        items: [
          {
            type: 'docSidebar',
            position: 'left',
            sidebarId: 'guides',
            label: 'Guides',
          },
          {
            type: 'docSidebar',
            position: 'left',
            sidebarId: 'docs',
            label: 'Docs',
          },
          {
            type: 'docSidebar',
            position: 'left',
            sidebarId: 'api',
            label: 'API Reference',
          },
          {
            type: 'docSidebar',
            position: 'left',
            sidebarId: 'exports',
            label: 'Exports',
          },
          {
            type: 'docSidebar',
            position: 'left',
            sidebarId: 'rfcs',
            label: 'RFCs',
          },
        ],
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    },
};

module.exports = config;
