import type { Core } from '@strapi/types';

import type { Services } from '../types';

export const getService = <TName extends keyof Services>(
  name: TName,
  strapiInstance: Core.Strapi = strapi
): Services[TName] => {
  return strapiInstance.plugin('upload').service<Services[TName]>(name);
};
