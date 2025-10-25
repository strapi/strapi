import type { Core } from '@strapi/types';

/**
 * Get a service from the audit-logging plugin
 */
export const getService = <T = any>(name: string, { strapi }: { strapi: Core.Strapi } = { strapi: global.strapi }): T => {
  return strapi.service(`plugin::audit-logging.${name}`);
};

/**
 * Get plugin configuration
 */
export const getPluginConfig = (strapi: Core.Strapi) => {
  return strapi.config.get('plugin::audit-logging', {});
};

export * from './config';