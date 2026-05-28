import { existsSync } from 'fs';
import { resolve } from 'path';
import koaFavicon from 'koa-favicon';
import type { Core } from '@strapi/types';

export type Config = NonNullable<Parameters<typeof koaFavicon>[1]>;

const defaults = {
  path: 'favicon.png',
  maxAge: 86400000,
};

export const favicon: Core.MiddlewareFactory<Config> = (config, { strapi }) => {
  const { maxAge, path: faviconPathConfig } = { ...defaults, ...config };
  const { root: appRoot } = strapi.dirs.app;
  let faviconPath = faviconPathConfig;

  if (!existsSync(resolve(appRoot, faviconPathConfig))) {
    if (existsSync(resolve(appRoot, defaults.path))) {
      faviconPath = defaults.path;
    } else if (existsSync(resolve(appRoot, 'favicon.ico'))) {
      faviconPath = 'favicon.ico';
    }
  }

  return koaFavicon(resolve(appRoot, faviconPath), { maxAge });
};
