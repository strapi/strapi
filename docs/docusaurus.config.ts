import { resolve } from 'path';
import { themes } from 'prism-react-renderer';
import type TypedocPlugin from 'docusaurus-plugin-typedoc';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { remarkDesignSystemLinks } from './remark-design-system-links';

const pluginTypedocOptions: Parameters<typeof TypedocPlugin>[1] = {
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

// Using `@cmfcmf/docusaurus-search-local` types are problematic
const pluginSearchLocalOptions = {
  indexBlog: false,
};

const presetClassicOptions: Preset.Options = {
  docs: {
    routeBasePath: '/',
    sidebarPath: require.resolve('./sidebars.ts'),
    editUrl: 'https://github.com/strapi/strapi/tree/main/docs/',
    remarkPlugins: [remarkDesignSystemLinks],
  },
  blog: false,
};

const themeConfig: Preset.ThemeConfig = {
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
    theme: themes.github,
    darkTheme: themes.dracula,
  },
};

const config: Config = {
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
              react: resolve(__dirname, './node_modules/react'),
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

export default config;
