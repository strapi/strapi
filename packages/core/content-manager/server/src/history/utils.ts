import type { Core } from '@strapi/types';

type HistoryServices = typeof import('./services').services;

function getService<T extends keyof HistoryServices>(strapi: Core.Strapi, name: T) {
  // Cast is needed because the return type of strapi.service is too vague
  return strapi.service(`plugin::content-manager.${name}`) as ReturnType<HistoryServices[T]>;
}

export { getService };
