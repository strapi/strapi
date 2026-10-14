import type { Core } from '@strapi/types';

/** Names of the registered services under `TNamespace`, e.g. `user` for `admin::user`. */
type ServiceName<TNamespace extends string> =
  keyof Strapi.Registries.PackageServices extends infer TUID
    ? TUID extends `${TNamespace}${infer TName}`
      ? TName
      : never
    : never;

/** Retrieves a registered admin service, including application overrides. */
export const getAdminService = <TName extends ServiceName<'admin::'>>(
  name: TName,
  { strapi }: { strapi: Core.Strapi } = { strapi: global.strapi }
): Core.ServiceFor<`admin::${TName}`> => {
  return strapi.service<Core.ServiceFor<`admin::${TName}`>>(`admin::${name}`);
};

/** Retrieves a registered Review Workflows service, including application overrides. */
export const getService = <TName extends ServiceName<'plugin::review-workflows.'>>(
  name: TName,
  { strapi } = { strapi: global.strapi }
): Core.ServiceFor<`plugin::review-workflows.${TName}`> => {
  return strapi
    .plugin('review-workflows')
    .service<Core.ServiceFor<`plugin::review-workflows.${TName}`>>(name);
};

export default {
  getAdminService,
  getService,
};
