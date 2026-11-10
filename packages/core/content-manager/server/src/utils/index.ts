import type { Core } from '@strapi/types';
import type {} from '../types';

import type { DocumentManagerService } from '../services/document-manager';
import type DocumentMetadata from '../services/document-metadata';
import type contentStructure from '../services/content-structure';

/** Develop's helper map: the published declarations, built without strict types, use it. */
type Services = {
  'content-structure': typeof contentStructure;
  'document-manager': DocumentManagerService;
  'document-metadata': typeof DocumentMetadata;
  [key: string]: any;
};

/**
 * With strict types, the registered contract, including application overrides. Without them, as on
 * develop, so the declarations emitted from inferred types stay the same.
 */
type ServiceOf<TName extends string> = Core.IsStrict extends true
  ? Core.ServiceFor<`plugin::content-manager.${TName}`>
  : ReturnType<Services[TName]>;

const getService = <TName extends string>(name: TName): ServiceOf<TName> => {
  return strapi.plugin('content-manager').service<ServiceOf<TName>>(name);
};

export { getService };
