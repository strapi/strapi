// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion
const path = require('path');
const {
  themes: { github: lightCodeTheme, dracula: darkCodeTheme },
} = require('prism-react-renderer');

/** @type {Parameters<import('docusaurus-plugin-typedoc')['default']>[1]} */
const pluginTypedocOptions = {
  entryPoints: ['../packages/core/strapi/src/admin.ts'],
  tsconfig: '../packages/core/strapi/tsconfig.build.json',
  // `readme: 'none'` uses a single project page (no separate index). Together with
  // `entryFileName: 'modules.md'` this avoids generating `index.md` (invalid MDX: bare `<br>` tags).
  // Do not set `entryFileName: null` — it becomes an empty URL and TypeDoc tries to write
  // to the output directory (EISDIR: "Could not write .../exports").
  readme: 'none',
  entryFileName: 'modules.md',
  // `docusaurus-plugin-typedoc` v1 writes to `out` directly; v0 prefixed it with the docs root.
  // So `out` must now include `docs/` itself for the generated pages to be picked up by Docusaurus.
  out: 'docs/exports',
  watch: !!process.env.TYPEDOC_WATCH,
};

/** @type {Partial<Parameters<import('@cmfcmf/docusaurus-search-local/src/server')['default']>[1]>} */
const pluginSearchLocalOptions = {
  indexBlog: false,
};

/** @type {import('@docusaurus/preset-classic').Options} */
const presetClassicOptions = {
  docs: {
    routeBasePath: '/',
    sidebarPath: require.resolve('./sidebars.js'),
    editUrl: 'https://github.com/strapi/strapi/tree/main/docs/',
    remarkPlugins: [require('./remark-design-system-links')],
  },
  blog: false,
};

/** @type {import('@docusaurus/preset-classic').ThemeConfig} */
const themeConfig = {
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
};

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Doc',
  tagline: 'Dinosaurs are cool',
  url: 'https://contributor.strapi.io',
  baseUrl: '/',
  onBrokenLinks: 'warn',
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
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
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
    ['docusaurus-plugin-typedoc', pluginTypedocOptions],
    ['@cmfcmf/docusaurus-search-local', pluginSearchLocalOptions],
  ],
  presets: [['classic', presetClassicOptions]],
  themeConfig,
};

module.exports = config;
