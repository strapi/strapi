import browserslistToEsbuild from 'browserslist-to-esbuild';
import { ESBuildMinifyPlugin } from 'esbuild-loader';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import ForkTsCheckerPlugin from 'fork-ts-checker-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import crypto from 'node:crypto';
import path from 'node:path';
import { Configuration, DefinePlugin, HotModuleReplacementPlugin } from 'webpack';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';

import { getAliases } from './aliases';
import { loadStrapiMonorepo } from '../core/monorepo';
import type { BuildContext } from '../createBuildContext';
import { loadFile } from '../core/files';

const resolveBaseConfig = async (ctx: BuildContext) => {
  const monorepo = await loadStrapiMonorepo(ctx.cwd);

  const target = browserslistToEsbuild(ctx.target);

  return {
    experiments: {
      topLevelAwait: true,
    },
    entry: {
      main: [`./${ctx.entry}`],
    },
    resolve: {
      alias: getAliases(ctx.cwd, monorepo),
      extensions: ['.js', '.jsx', '.react.js', '.ts', '.tsx'],
    },
    module: {
      rules: [
        {
          test: /\.(t|j)sx?$/,
          loader: require.resolve('esbuild-loader'),
          options: {
            loader: 'tsx',
            jsx: 'automatic',
            target,
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
        .update(Object.entries(baseConfig.resolve.alias).join())
        .digest('hex'),
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
    // @ts-expect-error
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

const getUserConfig = async (ctx: BuildContext): Promise<UserWebpackConfig | undefined> => {
  for (const file of USER_CONFIGS) {
    const filePath = path.join(ctx.appDir, 'src', 'admin', file);
    const configFile = await loadFile(filePath);

    if (configFile) {
      return configFile;
    }
  }

  return undefined;
};

const mergeConfigWithUserConfig = async (config: Configuration, ctx: BuildContext) => {
  const userConfig = await getUserConfig(ctx);

  if (userConfig) {
    const webpack = await import('webpack');
    return userConfig(config, webpack);
  }

  return config;
};

export { resolveProductionConfig, resolveDevelopmentConfig, mergeConfigWithUserConfig };
