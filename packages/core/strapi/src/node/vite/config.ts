import fs from 'node:fs';
import path from 'node:path';
import type { InlineConfig, UserConfig } from 'vite';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import resolveFrom from 'resolve-from';
import react from '@vitejs/plugin-react-swc';

import { getUserConfig } from '../core/config';
import { loadStrapiMonorepo } from '../core/monorepo';
import { getMonorepoAliases } from '../core/aliases';
import type { BuildContext } from '../create-build-context';
import { buildFilesPlugin } from './plugins';

/**
 * Core packages required by the Strapi admin panel that should always
 * be deduplicated to avoid multiple instances in the bundle.
 * https://react.dev/warnings/invalid-hook-call-warning#duplicate-react
 */
const CORE_ADMIN_DEPS = ['react', 'react-dom', 'react-router-dom', 'styled-components'];

/**
 * Collects dependency names from local plugins that are also resolvable from
 * the project root. These are added to Vite's `resolve.dedupe` to prevent
 * bundling duplicate copies when local plugins have their own node_modules
 * with overlapping dependencies.
 *
 * Without this, each local plugin can cause Vite to bundle a separate copy
 * of large packages like `@strapi/design-system` or `@strapi/icons`, leading
 * to excessive memory usage and OOM errors during the admin panel build.
 *
 * @see {@link https://github.com/strapi/strapi/issues/22946}
 */
const getLocalPluginDedupe = (ctx: BuildContext): string[] => {
  const pluginDeps = new Set<string>(CORE_ADMIN_DEPS);

  for (const plugin of ctx.plugins) {
    /**
     * Module plugins are resolved from the project's node_modules, so Vite
     * handles their deduplication natively. Only local plugins (resolved via
     * a filesystem path) can introduce duplicate dependency trees.
     */
    const localPluginPath = plugin.path;

    if (localPluginPath) {
      const packageJsonPath = path.join(localPluginPath, 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

          for (const dep of Object.keys(pkg.dependencies ?? {})) {
            pluginDeps.add(dep);
          }

          for (const dep of Object.keys(pkg.peerDependencies ?? {})) {
            pluginDeps.add(dep);
          }
        } catch {
          /**
           * Silently ignore plugins with a malformed package.json –
           * they will still work, just without dedupe optimisation.
           */
        }
      }
    }
  }

  /**
   * Only deduplicate packages that are actually resolvable from the project
   * root to avoid breaking resolution for plugin-specific dependencies that
   * are not available at the top level.
   */
  return Array.from(pluginDeps).filter(
    (dep) => !!resolveFrom.silent(ctx.cwd, path.join(dep, 'package.json'))
  );
};

const resolveBaseConfig = async (ctx: BuildContext): Promise<InlineConfig> => {
  const target = browserslistToEsbuild(ctx.target);
  const isMonorepoExampleApp = (ctx.strapi as any).internal_config?.uuid === 'getstarted';

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
      include: [
        // pre-bundle React dependencies to avoid React duplicates,
        // even if React dependencies are not direct dependencies
        // https://react.dev/warnings/invalid-hook-call-warning#duplicate-react
        'react',
        `react/jsx-runtime`,
        'react-dom/client',
        'styled-components',
        'react-router-dom',
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
              'prismjs/components/*.js',
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
              'motion',
            ]
          : []),
      ],
    },
    resolve: {
      dedupe: getLocalPluginDedupe(ctx),
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

export {
  mergeConfigWithUserConfig,
  resolveProductionConfig,
  resolveDevelopmentConfig,
  getLocalPluginDedupe,
};
