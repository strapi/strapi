import type { Plugin } from '@strapi/strapi';

/**
 * Extends the users-permissions plugin. The loader calls it with the plugin, whichever plugins the
 * app installs: an extension of a plugin this app does not install is never called.
 */
export default (plugin: Plugin.LoadedPlugin) => {
  const register = plugin.register;

  plugin.register = async ({ strapi }) => {
    await register({ strapi });
    strapi.log.debug('users-permissions extended');
  };

  return plugin;
};
