import { themes } from 'prism-react-renderer';
import type TypedocPlugin from 'docusaurus-plugin-typedoc';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type { Options as ClientRedirectsOptions } from '@docusaurus/plugin-client-redirects';
import type { PluginOptions as SearchLocalOptions } from '@easyops-cn/docusaurus-search-local';
import type { PluginOptions as LlmsOptions } from 'docusaurus-plugin-llms';
import workspacePackagesPlugin from './plugins/workspace-packages';
import { remarkDesignSystemLinks } from './remark-design-system-links';
import { redirects } from './redirects';
import { rewriteRepoRootMarkdownLinks } from './repo-root-markdown-links';

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
  watch: process.env.TYPEDOC_WATCH !== undefined,
};

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
  // TypeDoc output is generated at build time and is too large and noisy for LLM bundles.
  ignoreFiles: ['docs/exports/**'],
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
    remarkPlugins: [remarkDesignSystemLinks],
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
        type: 'docSidebar',
        position: 'left',
        sidebarId: 'exports',
        label: 'Exports',
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
    ['docusaurus-plugin-typedoc', pluginTypedocOptions],
    ['@easyops-cn/docusaurus-search-local', pluginSearchLocalOptions],
    ['@docusaurus/plugin-client-redirects', pluginClientRedirectsOptions],
    ['docusaurus-plugin-llms', pluginLlmsOptions],
  ],
  presets: [['classic', presetClassicOptions]],
  themeConfig,
};

export default config;
