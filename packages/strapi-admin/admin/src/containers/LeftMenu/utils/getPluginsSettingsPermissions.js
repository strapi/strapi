// Retrieve the plugin settings object
// The settings API works as follows for a plugin
// Declare the links that will be injected into the settings menu
//
// Path: my-plugin/admin/src/index.js
/*
 ************************************************************
 * 1. Declare a section that will be added to the setting menu
 * const menuSection = {
 *   // Unique id of the section
 *   id: pluginId,
 *   // Title of Menu section using i18n
 *   title: {
 *     id: `${pluginId}.foo`,
 *     defaultMessage: 'Super cool setting',
 *   },
 *   // Array of links to be displayed
 *   links: [
 *     {
 *       // Using string
 *       title: 'Setting page 1',
 *       to: `${strapi.settingsBaseURL}/${pluginId}/setting1`,
 *       name: 'setting1',
 *       permissions: [{ action: 'plugins::my-plugin.action-name', subject: null }],
 *     },
 *     {
 *       // Using i18n with a corresponding translation key
 *       title: {
 *         id: `${pluginId}.bar`,
 *         defaultMessage: 'Setting page 2',
 *       },
 *       to: `${strapi.settingsBaseURL}/${pluginId}/setting2`,
 *       name: 'setting2',
 *       permissions: [{ action: 'plugins::my-plugin.action-name2', subject: null }],
 *     },
 *   ],
 * };
 * ************************************************************
 * 2. Add a setting to the global section of the menu
 * const global = {
 *    links: [
 *     {
 *       title: {
 *         id: getTrad('plugin.name'),
 *         defaultMessage: 'Media Library',
 *       },
 *       name: 'media-library',
 *       to: `${strapi.settingsBaseURL}/media-library`,
 *       Component: SettingsPage,
 *      // TODO write documentation
 *      permissions: [{ action: 'plugins::my-plugin.action-name', subject: null }],
 *    },
 *   ],
 *  };
 ***********************************************************
 * 3. Define the settings in the plugin object
 * const settings =  { global, menuSection };
 */

import { get } from 'lodash';

const getPluginsSettingsPermissions = plugins => {
  const globalSettingsLinksPermissions = Object.values(plugins).reduce((acc, current) => {
    const pluginSettings = get(current, 'settings', {});
    const getSettingsLinkPermissions = settings => {
      return Object.values(settings).reduce((acc, current) => {
        const links = get(current, 'links', []);

        links.forEach(link => {
          const permissions = get(link, 'permissions', []);

          permissions.forEach(permission => {
            acc.push(permission);
          });
        });

        return acc;
      }, []);
    };

    const pluginPermissions = getSettingsLinkPermissions(pluginSettings);

    return [...acc, ...pluginPermissions];
  }, []);

  return [...globalSettingsLinksPermissions];
};

export default getPluginsSettingsPermissions;
