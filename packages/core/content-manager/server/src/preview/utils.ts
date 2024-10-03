import type { Core } from '@strapi/types';

type PreviewServices = typeof import('./services').services;

function getService<T extends keyof PreviewServices>(strapi: Core.Strapi, name: T) {
  // Cast is needed because the return type of strapi.service is too vague
  return strapi.service(`plugin::content-manager.${name}`) as ReturnType<PreviewServices[T]>;
}

export { getService };
