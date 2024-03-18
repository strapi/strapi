import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import { ESBuildMinifyPlugin } from 'esbuild-loader';
import ForkTsCheckerPlugin from 'fork-ts-checker-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import crypto from 'node:crypto';
import path from 'node:path';
import readPkgUp from 'read-pkg-up';
import {
  Configuration,
  DefinePlugin,
  HotModuleReplacementPlugin,
  WebpackPluginInstance,
} from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

import { loadStrapiMonorepo } from '../core/monorepo';
import type { BuildContext } from '../create-build-context';
import { getUserConfig } from '../core/config';
import { getMonorepoAliases } from '../core/aliases';

const resolveBaseConfig = async (ctx: BuildContext) => {
  const target = browserslistToEsbuild(ctx.target);

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
      },
      extensions: ['.js', '.jsx', '.react.js', '.ts', '.tsx'],
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          loader: require.resolve('esbuild-loader'),
          options: {
            loader: 'tsx',
            target,
            jsx: 'automatic',
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
      new DefinePlugin(
        Object.entries(ctx.env).reduce<Record<string, string>>((acc, [key, value]) => {
          acc[`process.env.${key}`] = JSON.stringify(value);
          return acc;
        }, {})
      ),
      ctx.tsconfig &&
        new ForkTsCheckerPlugin({
          typescript: {
            configFile: ctx.tsconfig.path,
            configOverwrite: {
              compilerOptions: {
                sourceMap: ctx.options.sourcemaps,
              },
            },
          },
        }),
    ].filter(Boolean),
  };
};

const resolveDevelopmentConfig = async (ctx: BuildContext): Promise<Configuration> => {
  const baseConfig = await resolveBaseConfig(ctx);
  const monorepo = await loadStrapiMonorepo(ctx.cwd);

  return {
    ...baseConfig,
    cache: {
      type: 'filesystem',
      // version cache when there are changes to aliases
      buildDependencies: {
        config: [__filename],
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
      publicPath: ctx.basePath,
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
  const target = browserslistToEsbuild(ctx.target);

  const baseConfig = await resolveBaseConfig(ctx);

  return {
    ...baseConfig,
    stats: 'errors-only',
    mode: 'production',
    bail: true,
    devtool: ctx.options.sourcemaps ? 'source-map' : false,
    output: {
      path: ctx.distPath,
      publicPath: ctx.basePath,
      // Utilize long-term caching by adding content hashes (not compilation hashes)
      // to compiled assets for production
      filename: '[name].[contenthash:8].js',
      chunkFilename: '[name].[contenthash:8].chunk.js',
    },
    optimization: {
      minimize: ctx.options.minify,
      minimizer: [
        new ESBuildMinifyPlugin({
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
      ctx.options.stats && (new BundleAnalyzerPlugin() as unknown as WebpackPluginInstance), // TODO: find out if this is an actual issue or just a ts bug
    ].filter(Boolean),
  };
};

const USER_CONFIGS = ['webpack.config.js', 'webpack.config.mjs', 'webpack.config.ts'];

type UserWebpackConfig = (config: Configuration, webpack: unknown) => Configuration;

const mergeConfigWithUserConfig = async (config: Configuration, ctx: BuildContext) => {
  const userConfig = await getUserConfig<UserWebpackConfig>(USER_CONFIGS, ctx);

  if (userConfig) {
    if (typeof userConfig === 'function') {
      const webpack = await import('webpack');
      return userConfig(config, webpack);
    }

    ctx.logger.warn(
      `You've exported something other than a function from ${path.join(
        ctx.appDir,
        'src',
        'admin',
        'webpack.config'
      )}, this will ignored.`
    );
  }

  return config;
};

/**
 * @internal This function is used to resolve the path of a module.
 * It mimics what vite does internally already.
 */
const getModulePath = (mod: string) => {
  const modulePath = require.resolve(mod);
  const pkg = readPkgUp.sync({ cwd: path.dirname(modulePath) });
  return pkg ? path.dirname(pkg.path) : modulePath;
};

export { mergeConfigWithUserConfig, resolveDevelopmentConfig, resolveProductionConfig };
