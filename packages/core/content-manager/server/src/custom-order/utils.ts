import type { Core } from '@strapi/types';

import { FUTURE_FLAG } from './constants';

type CustomOrderServices = typeof import('./services').services;

function getService<T extends keyof CustomOrderServices>(strapi: Core.Strapi, name: T) {
  // Cast is needed because the return type of strapi.service is too vague
  return strapi.service(`plugin::content-manager.${name}`) as ReturnType<CustomOrderServices[T]>;
}

const isFeatureEnabled = (strapi: Core.Strapi) => strapi.features.future.isEnabled(FUTURE_FLAG);

export { getService, isFeatureEnabled };
