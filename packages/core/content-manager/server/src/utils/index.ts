import type { Core } from '@strapi/types';
import type {} from '../types';

/** Resolve registered contracts while retaining compatibility for unregistered services. */
const getService = <TName extends string>(
  name: TName
): Core.ServiceFor<`plugin::content-manager.${TName}`> => {
  return strapi
    .plugin('content-manager')
    .service<Core.ServiceFor<`plugin::content-manager.${TName}`>>(name);
};

export { getService };
