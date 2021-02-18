import { get, omit, set } from 'lodash';
import { SETTINGS_BASE_URL } from '../../config';
import { sortLinks } from '../../utils';
import { getSettingsMenuLinksPermissions } from './utils';

const init = (initialState, plugins = {}, settingsMenu = [], settingsLinkNotificationCount = 0) => {
  const settingsLinkPermissions = getSettingsMenuLinksPermissions(settingsMenu);

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

  if (!settingsLinkPermissions.filter(perm => perm === null).length && settingsLinkIndex !== -1) {
    const permissionsPath = ['generalSectionLinks', settingsLinkIndex, 'permissions'];
    const notificationPath = ['generalSectionLinks', settingsLinkIndex, 'notificationsCount'];

    set(initialState, permissionsPath, settingsLinkPermissions);
    set(initialState, notificationPath, settingsLinkNotificationCount);
  }

  if (sortedLinks.length) {
    set(initialState, 'pluginsSectionLinks', sortedLinks);
  }

  return initialState;
};

export default init;
