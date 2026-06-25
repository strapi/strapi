import type { Core } from '@strapi/types';

/**
 * Resolves the deprecated `server.globalProxy` key when `server.proxy.global` is unset.
 */
export const getServerGlobalProxy = (config: Core.ConfigProvider) =>
  config.get<string>('server.proxy.global') ?? config.get<string>('server.globalProxy');

/**
 * Whether `strapi develop` should open the admin panel in a browser.
 *
 * Prefers `admin.autoOpen`, then deprecated `server.admin.autoOpen`, then defaults to `true`.
 */
export const shouldOpenAdminOnDevelop = (config: Core.ConfigProvider) => {
  const adminAutoOpen = config.get<boolean | undefined>('admin.autoOpen');

  if (adminAutoOpen !== undefined) {
    return adminAutoOpen !== false;
  }

  const serverAdminAutoOpen = config.get<boolean | undefined>('server.admin.autoOpen');

  if (serverAdminAutoOpen !== undefined) {
    return serverAdminAutoOpen !== false;
  }

  return true;
};
