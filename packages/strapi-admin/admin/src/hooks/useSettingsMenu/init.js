import { retrieveGlobalLinks, retrievePluginsMenu, sortLinks } from '../../utils';
import { SETTINGS_BASE_URL } from '../../config';
import adminPermissions from '../../permissions';
import formatLinks from './utils/formatLinks';
import globalLinks from './utils/globalLinks';

const init = (initialState, plugins) => {
  // Retrieve the links that will be injected into the global section
  const pluginsGlobalLinks = retrieveGlobalLinks(plugins);
  // Sort the links by name
  const sortedGlobalLinks = sortLinks([...pluginsGlobalLinks, ...globalLinks]);
  // Create the plugins settings sections
  // Note it is currently not possible to add a link into a plugin section
  const pluginsMenuSections = retrievePluginsMenu(plugins);

  const menu = [
    {
      id: 'global',
      title: { id: 'Settings.global' },
      links: sortedGlobalLinks,
    },
    {
      id: 'permissions',
      title: 'Settings.permissions',
      links: [
        {
          title: { id: 'Settings.permissions.menu.link.roles.label' },
          to: `${SETTINGS_BASE_URL}/roles`,
          name: 'roles',
          isDisplayed: false,
          permissions: adminPermissions.settings.roles.main,
        },
        {
          title: { id: 'Settings.permissions.menu.link.users.label' },
          // Init the search params directly
          to: `${SETTINGS_BASE_URL}/users?pageSize=10&page=1&_sort=firstname%3AASC`,
          name: 'users',
          isDisplayed: false,
          permissions: adminPermissions.settings.users.main,
        },
      ],
    },
    ...pluginsMenuSections,
  ];

  return { ...initialState, menu: formatLinks(menu) };
};

export default init;
