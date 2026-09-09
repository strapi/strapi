import type { Core } from '@strapi/types';

type AutosaveServices = typeof import('./services').services;

function getService<T extends keyof AutosaveServices>(strapi: Core.Strapi, name: T) {
  // Cast is needed because the return type of strapi.service is too vague
  return strapi.service(`plugin::content-manager.${name}`) as ReturnType<AutosaveServices[T]>;
}

export { getService };
