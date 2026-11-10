import { existsSync } from 'fs';
import { resolve } from 'path';
import koaFavicon from 'koa-favicon';
import type { Core } from '@strapi/types';

/** Options the `strapi::favicon` middleware reads. */
export type Config = {
  /** Favicon path, relative to the application root. */
  path?: string;
  /** Browser cache max-age of the favicon, in milliseconds. */
  maxAge?: number;
};

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
