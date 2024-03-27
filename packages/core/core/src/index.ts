import type { Core } from '@strapi/types';

import Strapi, { type StrapiOptions } from './Strapi';
import { destroyOnSignal, resolveWorkingDirectories, createUpdateNotifier } from './utils';

export { default as compileStrapi } from './compile';
export * as factories from './factories';

export const createStrapi = (options: Partial<StrapiOptions> = {}): Core.Strapi => {
  const strapi = new Strapi({
    ...options,
    ...resolveWorkingDirectories(options),
  });

  destroyOnSignal(strapi);
  createUpdateNotifier(strapi);

  // TODO: deprecate and remove in next major
  global.strapi = strapi;

  return strapi;
};
