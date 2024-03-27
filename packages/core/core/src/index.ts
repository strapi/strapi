import type { Core } from '@strapi/types';

import Strapi, { type StrapiOptions } from './Strapi';

export { default as compileStrapi } from './compile';
export * as factories from './factories';

export const createStrapi = (options: StrapiOptions = {}): Core.Strapi => {
  const strapi = new Strapi(options);

  // TODO: deprecate and remove in next major
  global.strapi = strapi as unknown as Required<Core.Strapi>;

  return strapi;
};
