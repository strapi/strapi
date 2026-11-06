import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import { EsbuildPlugin } from 'esbuild-loader';
import ForkTsCheckerPlugin from 'fork-ts-checker-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import crypto from 'node:crypto';
import path from 'node:path';
import { Configuration, DefinePlugin, HotModuleReplacementPlugin } from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

import { loadStrapiMonorepo } from '../core/monorepo';
import type { BuildContext } from '../create-build-context';
import { getUserConfig } from '../core/config';
import { getLinkedDesignSystemPath } from '../core/linked-packages';
import { getMonorepoAliases } from '../core/aliases';
import { getModulePath } from '../core/resolve-module';
import { buildSingletonAliasEntries } from '../core/admin-vite-aliases';

// esbuild's support table does not recognize current browserslist versions, so the
// intersection of those targets is reported as missing arbitrary module namespace
// names. Dual-published packages then fail on `export { x as "module.exports" }`.
// The syntax has been supported by the admin's browsers since 2021.
const esbuildSupported = {
  'arbitrary-module-namespace-names': true,
};

const strapiProcessEnvPlugins = new WeakSet<object>();

const resolveBaseConfig = async (ctx: BuildContext, nodeEnv: 'development' | 'production') => {
  const { default: browserslistToEsbuild } = await import('browserslist-to-esbuild');
  const target = browserslistToEsbuild(ctx.target);
  const bundledEnv = { ...ctx.env, NODE_ENV: nodeEnv };

  const definePlugin = new DefinePlugin({
    ...Object.entries(bundledEnv).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[`process.env.${key}`] = JSON.stringify(value);
      return acc;
    }, {}),
    // Unlisted `process.env.*` reads (optional flags) must resolve to undefined
    // in the browser instead of throwing `process is not defined`.
    // mergeConfigWithUserConfig drops this key when src/admin/webpack.config
    // defines `process.env` itself. This plugin is applied first, and webpack
    // keeps the first value for an expression, so the key would hide the user's.
    'process.env': JSON.stringify(bundledEnv),
    // picomatch (via micromatch) reads `process.platform` on load and `process.version`
    // for lookbehind patterns.
    'process.platform': JSON.stringify('browser'),
    'process.version': JSON.stringify(''),
  });
  strapiProcessEnvPlugins.add(definePlugin);

  return {
    experiments: {
      topLevelAwait: true,
    },
    entry: {
      main: [`./${ctx.entry}`],
    },
    resolve: {
      alias: {
        react: getModulePath('react'),
        'react-dom': getModulePath('react-dom'),
        'styled-components': getModulePath('styled-components'),
        'react-router-dom': getModulePath('react-router-dom'),
        // Force single instance so plugin custom field chunks inherit root DesignSystemProvider context
        '@strapi/design-system': getModulePath('@strapi/design-system'),
        // Force a single CodeMirror instance (resolved from design-system's closure) so the JSON
        // custom field does not crash on cross-copy instanceof checks. Tolerant: unresolvable
        // optional/transitive CodeMirror packages are skipped
        ...Object.fromEntries(buildSingletonAliasEntries()),
        '@radix-ui/react-tooltip': getModulePath('@radix-ui/react-tooltip'),
      },
      extensions: ['.js', '.jsx', '.react.js', '.ts', '.tsx'],
      // micromatch (used by the content-type builder) imports Node builtins.
      fallback: {
        path: require.resolve('path-browserify'),
        // Trailing slash resolves the npm `util` package rather than the Node builtin.
        // eslint-disable-next-line node/no-missing-require
        util: require.resolve('util/'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx$/,
          loader: require.resolve('esbuild-loader'),
          options: {
            loader: 'tsx',
            target,
            jsx: 'automatic',
            supported: esbuildSupported,
          },
        },
        {
          // The tsx loader parses `<T, U>` generics as JSX and fails the admin build.
          test: /\.ts$/,
          loader: require.resolve('esbuild-loader'),
          options: {
            loader: 'ts',
            target,
            supported: esbuildSupported,
          },
        },
        {
          test: /\.(js|jsx|mjs)$/,
          use: {
            loader: require.resolve('esbuild-loader'),
            options: {
              loader: 'jsx',
              target,
              jsx: 'automatic',
              supported: esbuildSupported,
            },
          },
        },
        {
          test: /\.m?js/,
          resolve: {
            fullySpecified: false,
          },
        },
        {
          test: /\.css$/i,
          use: [require.resolve('style-loader'), require.resolve('css-loader')],
        },
        {
          test: /\.(svg|eot|otf|ttf|woff|woff2)$/,
          type: 'asset/resource',
        },
        {
          test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.ico$/],
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 1000,
            },
          },
        },
        {
          test: /\.(mp4|webm)$/,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 10000,
            },
          },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        inject: true,
        template: path.resolve(ctx.runtimeDir, 'index.html'),
      }),
      definePlugin,
      ctx.tsconfig &&
        new ForkTsCheckerPlugin({
          typescript: {
            configFile: ctx.tsconfig.path,
            configOverwrite: {
              compilerOptions: {
                sourceMap: ctx.options.sourcemap,
              },
            },
          },
        }),
    ].filter(Boolean),
  };
};

const resolveDevelopmentConfig = async (ctx: BuildContext): Promise<Configuration> => {
  const baseConfig = await resolveBaseConfig(ctx, 'development');
  const monorepo = await loadStrapiMonorepo(ctx.cwd);
  const linkedDesignSystemPath = getLinkedDesignSystemPath();

  return {
    ...baseConfig,
    cache: {
      type: 'filesystem',
      // version cache when there are changes to aliases
      buildDependencies: {
        config: [__filename],
        // When design-system is linked, invalidate cache when it changes
        ...(linkedDesignSystemPath && {
          designSystem: [path.join(linkedDesignSystemPath, 'dist')],
        }),
      },
      version: crypto
        .createHash('md5')
        .update(Object.entries(baseConfig.resolve.alias ?? {}).join())
        .digest('hex'),
    },
    resolve: {
      ...baseConfig.resolve,
      alias: {
        ...baseConfig.resolve.alias,
        ...getMonorepoAliases({ monorepo }),
      },
    },
    entry: {
      ...baseConfig.entry,
      main: [
        `${require.resolve('webpack-hot-middleware/client')}?path=/__webpack_hmr`,
        ...baseConfig.entry.main,
      ],
    },
    stats: 'errors-warnings',
    mode: 'development',
    devtool: 'inline-source-map',
    output: {
      filename: '[name].js',
      path: ctx.distPath,
      publicPath: `${ctx.basePath.replace(/\/$/, '')}/`,
    },
    infrastructureLogging: {
      level: 'error',
    },
    plugins: [
      ...baseConfig.plugins,
      new HotModuleReplacementPlugin(),
      new ReactRefreshWebpackPlugin(),
    ],
  };
};

const resolveProductionConfig = async (ctx: BuildContext): Promise<Configuration> => {
  const { default: browserslistToEsbuild } = await import('browserslist-to-esbuild');
  const target = browserslistToEsbuild(ctx.target);

  const baseConfig = await resolveBaseConfig(ctx, 'production');

  return {
    ...baseConfig,
    stats: 'errors-only',
    mode: 'production',
    bail: true,
    devtool: ctx.options.sourcemap ? 'source-map' : false,
    output: {
      path: ctx.distPath,
      publicPath: `${ctx.basePath.replace(/\/$/, '')}/`,
      // Utilize long-term caching by adding content hashes (not compilation hashes)
      // to compiled assets for production
      filename: '[name].[contenthash:8].js',
      chunkFilename: '[name].[contenthash:8].chunk.js',
    },
    optimization: {
      minimize: ctx.options.minify,
      minimizer: [
        new EsbuildPlugin({
          target,
          css: true, // Apply minification to CSS assets
        }),
      ],
      moduleIds: 'deterministic',
      runtimeChunk: true,
    },
    plugins: [
      ...baseConfig.plugins,
      new MiniCssExtractPlugin({
        filename: '[name].[chunkhash].css',
        chunkFilename: '[name].[chunkhash].chunkhash.css',
        ignoreOrder: true,
      }),
      ctx.options.stats && new BundleAnalyzerPlugin(),
    ].filter(Boolean),
  };
};

const USER_CONFIGS = ['webpack.config.js', 'webpack.config.mjs', 'webpack.config.ts'];

type UserWebpackConfig = (config: Configuration, webpack: unknown) => Configuration;

const definesBareProcessEnv = (
  plugin: unknown
): plugin is { definitions: Record<string, unknown> } => {
  if (!plugin || typeof plugin !== 'object' || plugin.constructor?.name !== 'DefinePlugin') {
    return false;
  }

  const definitions = (plugin as { definitions?: unknown }).definitions;

  return (
    !!definitions &&
    typeof definitions === 'object' &&
    Object.prototype.hasOwnProperty.call(definitions, 'process.env')
  );
};

/**
 * Webpack uses the first DefinePlugin value for an expression. Strapi's plugin
 * is registered first, so its bare `process.env` object would hide a user's
 * `DefinePlugin({ 'process.env': … })`. Per-key `process.env.*` defines stay,
 * matching Vite, where a user define replaces Strapi's object.
 */
const preferUserProcessEnvDefine = (config: Configuration): Configuration => {
  const plugins = config.plugins ?? [];
  const userDefinesProcessEnv = plugins.some(
    (plugin) => !!plugin && !strapiProcessEnvPlugins.has(plugin) && definesBareProcessEnv(plugin)
  );

  if (!userDefinesProcessEnv) {
    return config;
  }

  for (const plugin of plugins) {
    if (plugin && strapiProcessEnvPlugins.has(plugin) && definesBareProcessEnv(plugin)) {
      delete plugin.definitions['process.env'];
    }
  }

  return config;
};

const mergeConfigWithUserConfig = async (config: Configuration, ctx: BuildContext) => {
  const userConfig = await getUserConfig<UserWebpackConfig>(USER_CONFIGS, ctx);
  let merged = config;

  if (userConfig) {
    if (typeof userConfig === 'function') {
      const webpack = await import('webpack');
      merged = userConfig(config, webpack);
    } else {
      ctx.logger.warn(
        `You've exported something other than a function from ${path.join(
          ctx.appDir,
          'src',
          'admin',
          'webpack.config'
        )}, this will ignored.`
      );
    }
  }

  return preferUserProcessEnvDefine(merged);
};

export { mergeConfigWithUserConfig, resolveDevelopmentConfig, resolveProductionConfig };
