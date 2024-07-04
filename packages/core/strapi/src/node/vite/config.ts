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
    base: ctx.basePath,
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
      middlewareMode: true,
      open: ctx.options.open,
      hmr: {
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
