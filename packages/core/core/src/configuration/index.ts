/* eslint-disable @typescript-eslint/no-var-requires */
import os from 'os';
import path from 'path';
import _ from 'lodash';
import { omit } from 'lodash/fp';
import dotenv from 'dotenv';
import type { Core } from '@strapi/types';

import { getConfigUrls, getAbsoluteAdminUrl, getAbsoluteServerUrl } from './urls';
import loadConfigDir from './config-loader';
import { getDirs } from './get-dirs';

import type { StrapiOptions } from '../Strapi';

dotenv.config({ path: process.env.ENV_PATH });

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const { version: strapiVersion } = require(path.join(__dirname, '../../package.json'));

const defaultConfig = {
  server: {
    host: process.env.HOST || os.hostname() || 'localhost',
    port: Number(process.env.PORT) || 1337,
    proxy: false,
    cron: { enabled: false },
    admin: { autoOpen: false },
    dirs: { public: './public' },
    transfer: {
      remote: {
        enabled: true,
      },
    },
    logger: {
      updates: {
        enabled: true,
      },
      startup: {
        enabled: true,
      },
    },
  } satisfies Partial<Core.Config.Server>,
  admin: {} satisfies Partial<Core.Config.Admin>,
  api: {
    rest: {
      prefix: '/api',
    },
  } satisfies Partial<Core.Config.Api>,
};

export const loadConfiguration = (opts: StrapiOptions) => {
  const { appDir, distDir, autoReload = false, serveAdminPanel = true } = opts;

  const pkgJSON = require(path.resolve(appDir, 'package.json'));

  const configDir = path.resolve(distDir || process.cwd(), 'config');

  const rootConfig = {
    launchedAt: Date.now(),
    autoReload,
    environment: process.env.NODE_ENV,
    uuid: _.get(pkgJSON, 'strapi.uuid'),
    packageJsonStrapi: _.omit(_.get(pkgJSON, 'strapi', {}), 'uuid'),
    info: {
      ...pkgJSON,
      strapi: strapiVersion,
    },
    admin: {
      serveAdminPanel,
    },
  };

  // See packages/core/core/src/domain/module/index.ts for plugin config loading
  const baseConfig = omit('plugins', loadConfigDir(configDir)); // plugin config will be loaded later

  const envDir = path.resolve(configDir, 'env', process.env.NODE_ENV as string);
  const envConfig = loadConfigDir(envDir);

  const config = _.merge(rootConfig, defaultConfig, baseConfig, envConfig);

  const { serverUrl, adminUrl, adminPath } = getConfigUrls(config);

  _.set(config, 'server.url', serverUrl);
  _.set(config, 'server.absoluteUrl', getAbsoluteServerUrl(config));
  _.set(config, 'admin.url', adminUrl);
  _.set(config, 'admin.path', adminPath);
  _.set(config, 'admin.absoluteUrl', getAbsoluteAdminUrl(config));
  _.set(config, 'dirs', getDirs(opts, config));

  return config;
};
