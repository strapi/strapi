import omit from 'lodash/omit';
import sortLinks from './utils/sortLinks';
import adminPermissions from '../../permissions';
import formatLinks from './utils/formatLinks';
import globalLinks from './utils/globalLinks';

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
      links: [
        {
          intlLabel: { id: 'global.auditLogs', defaultMessage: 'Audit Logs' },
          to: '/settings/audit-logs',
          id: 'auditLogs',
          isDisplayed: false,
          permissions: adminPermissions.settings.auditLogs.main,
        },
        {
          intlLabel: { id: 'global.roles', defaultMessage: 'Roles' },
          to: '/settings/roles',
          id: 'roles',
          isDisplayed: false,
          permissions: adminPermissions.settings.roles.main,
        },
        {
          intlLabel: { id: 'global.users' },
          // Init the search params directly
          to: '/settings/users?pageSize=10&page=1&sort=firstname',
          id: 'users',
          isDisplayed: false,
          permissions: adminPermissions.settings.users.main,
        },
      ],
    },
    ...otherSections,
  ];

  return { ...initialState, menu: formatLinks(menu) };
};

export default init;
