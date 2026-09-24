import type { Core } from '@strapi/types';

type ServiceName = keyof Strapi.Registries.PackageServices extends infer TUID
  ? TUID extends `plugin::i18n.${infer TName}`
    ? TName
    : never
  : never;

const getCoreStore = () => {
  return strapi.store({ type: 'plugin', name: 'i18n' });
};

/** Retrieves a registered i18n service, including application overrides. */
const getService = <TName extends ServiceName>(
  name: TName
): Core.ServiceFor<`plugin::i18n.${TName}`> => {
  return strapi.plugin('i18n').service<Core.ServiceFor<`plugin::i18n.${TName}`>>(name);
};

export { getService, getCoreStore };
