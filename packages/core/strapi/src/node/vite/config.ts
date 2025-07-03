import type { InlineConfig, UserConfig } from 'vite';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import react from '@vitejs/plugin-react-swc';

import { getUserConfig } from '../core/config';
import { loadStrapiMonorepo } from '../core/monorepo';
import { getMonorepoAliases } from '../core/aliases';
import type { BuildContext } from '../create-build-context';
import { buildFilesPlugin } from './plugins';

const resolveBaseConfig = async (ctx: BuildContext): Promise<InlineConfig> => {
  const target = browserslistToEsbuild(ctx.target);

  return {
    root: ctx.cwd,
    base: ctx.basePath,
    build: {
      emptyOutDir: false, // Rely on CLI to do this
      outDir: ctx.distDir,
      target,
    },
    cacheDir: 'node_modules/.strapi/vite',
    configFile: false,
    define: {
      'process.env': ctx.env,
    },
    envPrefix: 'STRAPI_ADMIN_',
    optimizeDeps: {
      include: [
        // pre-bundle React dependencies to avoid React duplicates,
        // even if React dependencies are not direct dependencies
        // https://react.dev/warnings/invalid-hook-call-warning#duplicate-react
        'react',
        `react/jsx-runtime`,
        'react-dom/client',
        'styled-components',
        'react-router-dom',
        // pre-bundle other dependencies that would otherwise cause a page reloads when imported.
        // see "performance" section https://vite.dev/guide/dep-pre-bundling.html#the-why
        '@dnd-kit/core',
        '@dnd-kit/sortable',
        '@dnd-kit/utilities',
        '@radix-ui/react-toolbar',
        'codemirror5',
        'codemirror5/addon/display/placeholder',
        'date-fns-tz',
        'date-fns/format',
        'date-fns/formatISO',
        'highlight.js',
        'lodash/capitalize',
        'lodash/fp',
        'lodash/groupBy',
        'lodash/has',
        'lodash/isNil',
        'lodash/locale',
        'lodash/map',
        'lodash/mapValues',
        'lodash/pull',
        'lodash/size',
        'lodash/sortBy',
        'lodash/tail',
        'lodash/toLower',
        'lodash/toNumber',
        'lodash/toString',
        'lodash/truncate',
        'lodash/uniq',
        'lodash/upperFirst',
        'markdown-it',
        'markdown-it-abbr',
        'markdown-it-container',
        'markdown-it-deflist',
        'markdown-it-emoji',
        'markdown-it-footnote',
        'markdown-it-ins',
        'markdown-it-mark',
        'markdown-it-sub',
        'markdown-it-sup',
        'prismjs/components/prism-asmatmel',
        'prismjs/components/prism-bash',
        'prismjs/components/prism-basic',
        'prismjs/components/prism-c',
        'prismjs/components/prism-clojure',
        'prismjs/components/prism-cobol',
        'prismjs/components/prism-cpp',
        'prismjs/components/prism-csharp',
        'prismjs/components/prism-dart',
        'prismjs/components/prism-docker',
        'prismjs/components/prism-elixir',
        'prismjs/components/prism-erlang',
        'prismjs/components/prism-fortran',
        'prismjs/components/prism-fsharp',
        'prismjs/components/prism-go',
        'prismjs/components/prism-graphql',
        'prismjs/components/prism-groovy',
        'prismjs/components/prism-haskell',
        'prismjs/components/prism-haxe',
        'prismjs/components/prism-ini',
        'prismjs/components/prism-java',
        'prismjs/components/prism-javascript',
        'prismjs/components/prism-json',
        'prismjs/components/prism-jsx',
        'prismjs/components/prism-julia',
        'prismjs/components/prism-kotlin',
        'prismjs/components/prism-latex',
        'prismjs/components/prism-lua',
        'prismjs/components/prism-makefile',
        'prismjs/components/prism-markdown',
        'prismjs/components/prism-matlab',
        'prismjs/components/prism-objectivec',
        'prismjs/components/prism-perl',
        'prismjs/components/prism-php',
        'prismjs/components/prism-powershell',
        'prismjs/components/prism-python',
        'prismjs/components/prism-r',
        'prismjs/components/prism-ruby',
        'prismjs/components/prism-rust',
        'prismjs/components/prism-sas',
        'prismjs/components/prism-scala',
        'prismjs/components/prism-scheme',
        'prismjs/components/prism-sql',
        'prismjs/components/prism-stata',
        'prismjs/components/prism-swift',
        'prismjs/components/prism-tsx',
        'prismjs/components/prism-typescript',
        'prismjs/components/prism-vbnet',
        'prismjs/components/prism-yaml',
        'react-colorful',
        'react-dnd-html5-backend',
        'react-window',
        'sanitize-html',
        'semver',
        'semver/functions/lt',
        'semver/functions/valid',
        'slate',
        'slate-history',
        'slate-react',
      ],
    },
    resolve: {
      // https://react.dev/warnings/invalid-hook-call-warning#duplicate-react
      dedupe: ['react', 'react-dom', 'react-router-dom', 'styled-components'],
    },
    plugins: [react(), buildFilesPlugin(ctx)],
  };
};

const resolveProductionConfig = async (ctx: BuildContext): Promise<InlineConfig> => {
  const {
    options: { minify, sourcemaps },
  } = ctx;

  const baseConfig = await resolveBaseConfig(ctx);

  return {
    ...baseConfig,
    logLevel: 'silent',
    mode: 'production',
    build: {
      ...baseConfig.build,
      assetsDir: '',
      minify,
      sourcemap: sourcemaps,
      rollupOptions: {
        input: {
          strapi: ctx.entry,
        },
      },
    },
  };
};

const resolveDevelopmentConfig = async (ctx: BuildContext): Promise<InlineConfig> => {
  const monorepo = await loadStrapiMonorepo(ctx.cwd);
  const baseConfig = await resolveBaseConfig(ctx);

  return {
    ...baseConfig,
    mode: 'development',
    resolve: {
      ...baseConfig.resolve,
      alias: {
        ...baseConfig.resolve?.alias,
        ...getMonorepoAliases({ monorepo }),
      },
    },
    server: {
      cors: false,
      middlewareMode: true,
      open: ctx.options.open,
      hmr: {
        overlay: false,
        server: ctx.options.hmrServer,
        clientPort: ctx.options.hmrClientPort,
      },
    },
    appType: 'custom',
  };
};

const USER_CONFIGS = ['vite.config.js', 'vite.config.mjs', 'vite.config.ts'];

type UserViteConfig = (config: UserConfig) => UserConfig;

const mergeConfigWithUserConfig = async (config: InlineConfig, ctx: BuildContext) => {
  const userConfig = await getUserConfig<UserViteConfig>(USER_CONFIGS, ctx);

  if (userConfig) {
    return userConfig(config);
  }

  return config;
};

export { mergeConfigWithUserConfig, resolveProductionConfig, resolveDevelopmentConfig };
