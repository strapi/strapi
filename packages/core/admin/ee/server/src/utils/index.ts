import type { Core } from '@strapi/types';
import type { EnterpriseServices } from '../../../../server/src/types';

type ServiceName = keyof Strapi.Registries.PackageServices extends infer TUID
  ? TUID extends `admin::${infer TName}`
    ? TName
    : never
  : never;

/** EE code runs with the EE edition merged, so EE-extended services have their EE shape. */
type EEService<TName extends ServiceName> = TName extends keyof EnterpriseServices
  ? EnterpriseServices[TName]
  : Core.ServiceFor<`admin::${TName}`>;

/** Retrieves a registered admin service, including application overrides. */
export const getService = <TName extends ServiceName>(
  name: TName,
  { strapi }: { strapi: Core.Strapi } = { strapi: global.strapi }
): EEService<TName> => {
  return strapi.service<EEService<TName>>(`admin::${name}`);
};

export default {
  getService,
};
