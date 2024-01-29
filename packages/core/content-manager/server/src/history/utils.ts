import { Strapi } from '@strapi/types';
import { type services } from './services';

type HistoryServiceName = keyof typeof import('./services').services;

type HistoryServices = {
  [K in HistoryServiceName]: ReturnType<(typeof services)[K]>;
};

function getService<T extends keyof HistoryServices>(strapi: Strapi, name: T) {
  // Cast is needed because the return type of strapi.service is too vague
  return strapi.service(`plugin::content-manager.${name}`) as HistoryServices[T];
}

export { getService };
