import omit from 'lodash/omit';

import adminLinks from './utils/adminLinks';
import formatLinks from './utils/formatLinks';
import globalLinks from './utils/globalLinks';
import sortLinks from './utils/sortLinks';

const init = (initialState, { settings, shouldUpdateStrapi }) => {
  // Retrieve the links that will be injected into the global section
  const pluginsGlobalLinks = settings.global.links;
  // Sort the links by name
  const sortedGlobalLinks = sortLinks([...pluginsGlobalLinks, ...globalLinks]).map((link) => ({
    ...link,
    hasNotification: link.id === '000-application-infos' && shouldUpdateStrapi,
  }));

  const otherSections = Object.values(omit(settings, 'global'));

  const menu = [
    {
      ...settings.global,
      links: sortedGlobalLinks,
    },
    {
      id: 'permissions',
      intlLabel: { id: 'Settings.permissions', defaultMessage: 'Administration Panel' },
      links: adminLinks,
    },
    ...otherSections,
  ];

  return { ...initialState, menu: formatLinks(menu) };
};

export default init;
