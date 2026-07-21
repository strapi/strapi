import type { InlineConfig, UserConfig } from 'vite';

import { getUserConfig } from '../core/config';
import { ADMIN_VITE_DEDUPE_MODULES } from '../core/admin-vite-alias-modules';
import {
  buildAdminViteResolveAliases,
  getResolvableSingletonModules,
} from '../core/admin-vite-aliases';
import { collectAdminOptimizeDepsExclude } from '../core/admin-vite-optimize-exclude';
import { isDesignSystemLinked } from '../core/linked-packages';
import { loadStrapiMonorepo } from '../core/monorepo';
import { getMonorepoAliases } from '../core/aliases';
import type { BuildContext } from '../create-build-context';
import { buildFilesPlugin } from './plugins';

const resolveBaseConfig = async (ctx: BuildContext): Promise<InlineConfig> => {
  const { default: browserslistToEsbuild } = await import('browserslist-to-esbuild');
  const target = browserslistToEsbuild(ctx.target);
  const isMonorepoExampleApp = (ctx.strapi as any).internal_config?.uuid === 'getstarted';
  const designSystemLinked = isDesignSystemLinked();
  const pluginOptimizeDepsExclude = await collectAdminOptimizeDepsExclude(ctx.cwd, ctx.plugins);
  const optimizeDepsExclude = [
    ...(designSystemLinked ? ['@strapi/design-system'] : []),
    ...pluginOptimizeDepsExclude,
  ];

  // Imported dynamically so this file's CJS build resolves Vite's ESM Node API instead of
  // its CJS entry, which emits "The CJS build of Vite's Node API is deprecated".
  // https://vite.dev/guide/troubleshooting.html#vite-cjs-node-api-deprecated
  const { default: react } = await import('@vitejs/plugin-react-swc');

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
      process: {},
      'process.env': JSON.stringify(ctx.env),
    },
    envPrefix: 'STRAPI_ADMIN_',
    optimizeDeps: {
      // Contract (#26964, #26944, #27014):
      // - CJS packages imported by @strapi/admin MUST be in optimizeDeps.include (invariant, lodash, …).
      // - The admin entry host (@strapi/strapi) MUST NOT be in optimizeDeps.exclude.
      // When design-system is linked (portal:, file:, yarn link), exclude from pre-bundling
      // so changes are reflected without clearing node_modules/.strapi/vite cache.
      // Also skip pre-built ESM plugin UI libraries with React peers (see collectAdminOptimizeDepsExclude).
      ...(optimizeDepsExclude.length > 0 && { exclude: optimizeDepsExclude }),
      include: [
        // pre-bundle React dependencies to avoid React duplicates,
        // even if React dependencies are not direct dependencies
        // https://react.dev/warnings/invalid-hook-call-warning#duplicate-react
        'react',
        `react/jsx-runtime`,
        'react-dom/client',
        'styled-components',
        'react-router-dom',
        // Admin + RTK Query share react-redux context; pre-bundle so dev chunks cannot load a
        // second copy (avoids "could not find react-redux context value" after upgrades / hoisting).
        'react-redux',
        '@reduxjs/toolkit',
        // Pre-bundle design-system so plugin custom field chunks (dynamic imports) resolve
        // to the same instance as the main app. Otherwise TooltipProvider/DesignSystemProvider
        // context from the root is not seen by components in plugin chunks.
        // Omit when linked so local changes are picked up (see exclude above)
        ...(!designSystemLinked ? ['@strapi/design-system'] : []),
        '@radix-ui/react-tooltip',
        // CJS-only; required for @strapi/admin in dev (#26944, #26964, #27014).
        'lodash',
        'invariant',
        // UMD; without pre-bundling plugin chunks get empty namespace → "Prism is not defined" (#26964).
        'prismjs',
        // Content-manager Blocks code editor side-effect-imports these; they expect global `Prism`.
        // Must pre-bundle for all apps (not only monorepo examples) or fresh create-strapi-app
        // projects blank-crash the admin (#25070, #26964).
        'prismjs/components/*.js',
        // CodeMirror must be a single instance across design-system, lang-json and uiw or the
        // JSON custom field crashes on instanceof checks. Pre-bundle for every build — dev and
        // production — not only monorepo examples. Use the resolvable subset so include stays in
        // lockstep with resolve.alias (an unresolvable singleton must not be forced into pre-bundling).
        ...getResolvableSingletonModules(),
        /**
         * Pre-bundle other dependencies that would otherwise cause a page reload when imported.
         * See "performance" section: https://vite.dev/guide/dep-pre-bundling.html#the-why
         * Only include dependencies for our internal example apps, otherwise it will break
         * real user apps that may not have those dependencies.
         */
        ...(isMonorepoExampleApp
          ? [
              '@dnd-kit/core',
              '@dnd-kit/sortable',
              '@dnd-kit/utilities',
              '@dnd-kit/modifiers',
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
              'react-colorful',
              'react-dnd-html5-backend',
              'react-window',
              'semver',
              'semver/functions/lt',
              'semver/functions/valid',
              'slate',
              'slate-history',
              'slate-react',
              'motion',
            ]
          : []),
      ],
    },
    resolve: {
      // https://react.dev/warnings/invalid-hook-call-warning#duplicate-react
      // Include design-system so plugin chunks use the same instance and inherit root context
      dedupe: [...ADMIN_VITE_DEDUPE_MODULES],
      // Explicit aliases ensure resolution under pnpm's strict dependency isolation,
      // where packages imported by plugins may not be resolvable from plugin chunks
      alias: buildAdminViteResolveAliases(),
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
      /**
       * In middleware mode Strapi forwards the browser Host from reverse proxies (nginx, Traefik).
       * Vite 5+ blocks unknown hosts unless explicitly allowed (#23491).
       */
      allowedHosts: true,
      middlewareMode: true,
      open: ctx.options.open,
      hmr: {
        overlay: false,
        /**
         * Use Strapi's http.Server so HMR websockets reuse the app's listen port. A separate listener
         * plus clientPort pushes browsers toward host:5173-style URLs that fail behind proxies that
         * only expose the Strapi server port (#23491, #23008).
         */
        server: ctx.strapi.server.httpServer,
      },
    },
    appType: 'custom',
  };
};

const USER_CONFIGS = ['vite.config.js', 'vite.config.mjs', 'vite.config.ts', 'vite.config.mts'];

type UserViteConfig = (config: UserConfig) => UserConfig;

const mergeConfigWithUserConfig = async (config: InlineConfig, ctx: BuildContext) => {
  const userConfig = await getUserConfig<UserViteConfig>(USER_CONFIGS, ctx);

  if (userConfig) {
    return userConfig(config);
  }

  return config;
};

export { mergeConfigWithUserConfig, resolveProductionConfig, resolveDevelopmentConfig };
