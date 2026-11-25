import { themes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type { Options as ClientRedirectsOptions } from '@docusaurus/plugin-client-redirects';
import type { PluginOptions as SearchLocalOptions } from '@easyops-cn/docusaurus-search-local';
import type { PluginOptions as LlmsOptions } from 'docusaurus-plugin-llms';
import workspacePackagesPlugin from './plugins/workspace-packages';
import { redirects } from './redirects';
import { rewriteRepoRootMarkdownLinks } from './repo-root-markdown-links';

// `satisfies` keeps a plain object type: the plugin exports an `interface`, which does not fit
// Docusaurus' `PluginConfig` (no implicit index signature) when used as an annotation.
const pluginSearchLocalOptions = {
  hashed: true,
  // The docs plugin is mounted at the site root (docs-only mode).
  docsRouteBasePath: '/',
  indexBlog: false,
  // The package header (relations, links) repeats data of the package map: keep it out of results.
  ignoreCssSelectors: ['.package-header'],
} satisfies SearchLocalOptions;

const pluginClientRedirectsOptions: ClientRedirectsOptions = {
  redirects,
};

const pluginLlmsOptions: LlmsOptions = {
  generateLLMsTxt: true,
  generateLLMsFullTxt: true,
};

const presetClassicOptions: Preset.Options = {
  docs: {
    routeBasePath: '/',
    sidebarPath: require.resolve('./sidebars.ts'),
    editUrl: 'https://github.com/strapi/strapi/tree/develop/docs/',
    showLastUpdateTime: true,
    // Curated tag vocabulary (`docs/docs/tags.yml`): unknown tags in frontmatter fail the build.
    tags: 'tags.yml',
    onInlineTags: 'throw',
  },
  blog: false,
  theme: {
    customCss: require.resolve('./src/css/custom.css'),
  },
};

const themeConfig: Preset.ThemeConfig = {
  navbar: {
    title: 'Contributor docs',
    hideOnScroll: true,
    logo: {
      alt: 'Strapi',
      src: 'img/logo.svg',
      srcDark: 'img/logo_dark.svg',
      width: 100,
    },
    items: [
      {
        type: 'docSidebar',
        position: 'left',
        sidebarId: 'contributing',
        label: 'Contributing',
      },
      {
        type: 'docSidebar',
        position: 'left',
        sidebarId: 'architecture',
        label: 'Architecture',
      },
      {
        type: 'docSidebar',
        position: 'left',
        sidebarId: 'packages',
        label: 'Packages',
      },
      {
        type: 'docSidebar',
        position: 'left',
        sidebarId: 'api',
        label: 'API reference',
      },
      {
        href: 'https://docs.strapi.io',
        position: 'right',
        label: 'User docs',
      },
      {
        href: 'https://github.com/strapi/strapi',
        position: 'right',
        className: 'header-github-link',
        'aria-label': 'GitHub repository',
      },
    ],
  },
  prism: {
    theme: themes.github,
    darkTheme: themes.dracula,
  },
};

const config: Config = {
  title: 'Strapi contributor docs',
  tagline: 'How Strapi is built, and how to contribute to it',
  url: 'https://contributor.strapi.io',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenAnchors: 'warn',
  favicon: 'img/favicon.svg',
  organizationName: 'strapi',
  projectName: 'strapi',
  trailingSlash: false,
  themes: ['@docusaurus/theme-mermaid'],
  future: {
    v4: true,
    faster: true,
  },

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },
  markdown: {
    mermaid: true,
    // `.md` is CommonMark, `.mdx` is MDX (only for pages that import components).
    format: 'detect',
    preprocessor: rewriteRepoRootMarkdownLinks,
    hooks: {
      onBrokenMarkdownLinks: 'throw',
    },
  },
  plugins: [
    workspacePackagesPlugin,
    ['@easyops-cn/docusaurus-search-local', pluginSearchLocalOptions],
    ['@docusaurus/plugin-client-redirects', pluginClientRedirectsOptions],
    ['docusaurus-plugin-llms', pluginLlmsOptions],
  ],
  presets: [['classic', presetClassicOptions]],
  themeConfig,
};

export default config;
