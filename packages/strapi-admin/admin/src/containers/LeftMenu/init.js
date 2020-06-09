import { get, omit, set } from 'lodash';
import { SETTINGS_BASE_URL } from '../../config';
import { getPluginsSettingsPermissions, sortLinks } from './utils';

const init = (initialState, plugins = {}) => {
  // For each plugin retrieve the permissions associated to each injected link
  const settingsPermissions = getPluginsSettingsPermissions(plugins);

  const pluginsLinks = Object.values(plugins).reduce((acc, current) => {
    const pluginsSectionLinks = get(current, 'menu.pluginsSectionLinks', []);

    return [...acc, ...pluginsSectionLinks];
  }, []);
  const sortedLinks = sortLinks(pluginsLinks).map(link => {
    return { ...omit(link, 'name'), isDisplayed: false };
  });

  const settingsLinkIndex = initialState.generalSectionLinks.findIndex(
    obj => obj.destination === SETTINGS_BASE_URL
  );

  if (settingsPermissions.length && settingsLinkIndex !== -1) {
    const permissionsPath = ['generalSectionLinks', settingsLinkIndex, 'permissions'];
    const alreadyCreatedPermissions = get(initialState, permissionsPath, []);

    set(initialState, permissionsPath, [...alreadyCreatedPermissions, ...settingsPermissions]);
  }

  if (sortedLinks.length) {
    set(initialState, 'pluginsSectionLinks', sortedLinks);
  }

  return initialState;
};

export default init;
