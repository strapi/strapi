import { HotModuleReplacementPlugin, RspackOptions, RuleSetRule } from '@rspack/core';
// @ts-expect-error – no types
import ReactRefreshPlugin from '@rspack/plugin-react-refresh';
import path from 'node:path';

import { loadStrapiMonorepo } from '../core/monorepo';
import type { BuildContext } from '../createBuildContext';
import { getUserConfig } from '../core/config';
import { getMonorepoAliases } from '../core/aliases';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import findRoot from 'find-root';

const resolveBaseConfig = async (ctx: BuildContext) => {
  const monorepo = await loadStrapiMonorepo(ctx.cwd);

  return {
    entry: {
      main: [`./${ctx.entry}`],
    },
    resolve: {
      alias: {
        ...getMonorepoAliases({ monorepo }),
        'react/jsx-runtime.js': path.join(findRoot(require.resolve('react')), 'jsx-runtime'),
      },
    },
    module: {
      rules: [
        {
          test: /\.(svg|eot|otf|ttf|woff|woff2)$/,
          type: 'asset/resource',
        },
        {
          test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.ico$/],
          type: 'asset/resource',
          parser: {
            dataUrlCondition: {
              maxSize: 1000,
            },
          },
        },
        {
          test: /\.(mp4|webm)$/,
          type: 'asset/resource',
          parser: {
            dataUrlCondition: {
              maxSize: 10000,
            },
          },
        },
      ],
    },
    target: ['web'],
    builtins: {
      define: {
        ...Object.entries(ctx.env).reduce<Record<string, string>>((acc, [key, value]) => {
          acc[`process.env.${key}`] = JSON.stringify(value);
          return acc;
        }, {}),
      },
      html: [
        {
          filename: 'index.html',
          inject: true,
          template: path.resolve(ctx.runtimeDir, 'index.html'),
        },
      ],
    },
    // @ts-expect-error – we filter the array below
    plugins: [
      ctx.tsconfig &&
        new ForkTsCheckerWebpackPlugin({
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
  } satisfies RspackOptions;
};

const resolveDevelopmentConfig = async (ctx: BuildContext) => {
  const monorepo = await loadStrapiMonorepo(ctx.cwd);
  const baseConfig = await resolveBaseConfig(ctx);

  return {
    ...baseConfig,
    mode: 'development',
    experiments: {
      rspackFuture: {
        disableTransformByDefault: true,
      },
    },
    cache: true,
    entry: {
      ...baseConfig.entry,
      main: [
        `${require.resolve('webpack-hot-middleware/client')}?path=/__webpack_hmr`,
        ...baseConfig.entry.main,
      ],
    },
    stats: 'errors-warnings',
    devtool: 'inline-source-map',
    builtins: {
      ...baseConfig.builtins,
      define: {
        ...baseConfig.builtins.define,
        'process.env.NODE_ENV': JSON.stringify('development'),
      },
    },
    output: {
      filename: '[name].js',
      path: ctx.distPath,
      publicPath: ctx.basePath,
    },
    infrastructureLogging: {
      level: 'error',
    },
    module: {
      ...baseConfig.module,
      rules: [
        ...baseConfig.module.rules,
        {
          test: monorepo?.path ? [/\.jsx?$/, /\.tsx?$/] : [/\.jsx$/, /\.tsx?$/],
          use: {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'typescript',
                  tsx: true,
                },
                transform: {
                  react: {
                    runtime: 'automatic',
                    development: true,
                    refresh: true,
                  },
                },
              },
            },
          },
        },
      ],
    },
    plugins: [...baseConfig.plugins, new HotModuleReplacementPlugin(), new ReactRefreshPlugin()],
  } satisfies RspackOptions;
};

const resolveProductionConfig = async (ctx: BuildContext): Promise<RspackOptions> => {
  const monorepo = await loadStrapiMonorepo(ctx.cwd);
  const baseConfig = await resolveBaseConfig(ctx);

  // @ts-expect-error – the plugin array is fine.
  return {
    ...baseConfig,
    stats: 'errors-only',
    mode: 'production',
    devtool: ctx.options.sourcemaps ? 'source-map' : false,
    output: {
      path: ctx.distPath,
      publicPath: ctx.basePath,
      // Utilize long-term caching by adding content hashes (not compilation hashes)
      // to compiled assets for production
      filename: '[name].[contenthash:8].js',
      chunkFilename: '[name].[contenthash:8].chunk.js',
    },
    experiments: {
      css: true,
    },
    builtins: {
      ...baseConfig.builtins,
      define: {
        ...baseConfig.builtins.define,
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
    },
    module: {
      ...baseConfig.module,
      rules: [
        ...baseConfig.module.rules,
        monorepo?.path && {
          test: /\.jsx?$/,
          use: {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: {
                  syntax: 'ecmascript',
                  jsx: true,
                },
              },
            },
          },
        },
      ].filter(Boolean) as RuleSetRule[],
    },
    optimization: {
      minimize: ctx.options.minify,
      moduleIds: 'deterministic',
      runtimeChunk: true,
    },
  };
};

const USER_CONFIGS = [
  'rspack.config.js',
  'rspack.config.mjs',
  'rspack.config.cjs',
  'rspack.config.ts',
];

type UserWebpackConfig = (config: RspackOptions) => RspackOptions;

const mergeConfigWithUserConfig = async (
  config: RspackOptions,
  ctx: BuildContext
): Promise<RspackOptions> => {
  const userConfig = await getUserConfig<UserWebpackConfig>(USER_CONFIGS, ctx);

  if (userConfig) {
    return userConfig(config);
  }

  return config;
};

export { resolveProductionConfig, resolveDevelopmentConfig, mergeConfigWithUserConfig };
