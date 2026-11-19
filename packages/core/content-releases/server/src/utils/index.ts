import type { Core } from '@strapi/types';

import type { Services } from '../types';

export * from './action-filters';
export * from './entries';
export * from './publish-order';
export * from './publishability';
export * from './release-status';
export * from './transactions';

export const getService = <TName extends keyof Services>(
  name: TName,
  { strapi }: { strapi: Core.Strapi }
): Services[TName] => {
  return strapi.plugin('content-releases').service<Services[TName]>(name);
};
