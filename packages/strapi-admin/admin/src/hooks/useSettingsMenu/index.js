import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useGlobalContext } from 'strapi-helper-plugin';
import { retrieveGlobalLinks, retrievePluginsMenu } from '../../utils';

const useSettingsMenu = () => {
  const { formatMessage } = useIntl();
  const { plugins, settingsBaseURL } = useGlobalContext();
  // Retrieve the links that will be injected into the global section
  const globalLinks = useMemo(() => retrieveGlobalLinks(plugins), [plugins]);
  // Create the plugins settings section
  // Note it is currently not possible to add a link into a plugin section
  const pluginsMenu = useMemo(() => retrievePluginsMenu(plugins), [plugins]);

  const menu = [
    {
      id: 'global',
      title: { id: 'Settings.global' },
      links: [
        {
          title: formatMessage({ id: 'Settings.webhooks.title' }),
          to: `${settingsBaseURL}/webhooks`,
          name: 'webhooks',
          permissions: [
            { action: 'admin::webhook.create', subject: null },
            { action: 'admin::webhook.read', subject: null },
            { action: 'admin::webhook.update', subject: null },
            { action: 'admin::webhook.delete', subject: null },
          ],
        },
        ...globalLinks,
      ],
    },
    {
      id: 'permissions',
      title: 'Settings.permissions',
      links: [
        {
          title: formatMessage({ id: 'Settings.permissions.menu.link.roles.label' }),
          to: `${settingsBaseURL}/roles`,
          name: 'roles',
          permissions: [
            { action: 'admin::roles.create', subject: null },
            { action: 'admin::roles.update', subject: null },
            { action: 'admin::roles.read', subject: null },
            { action: 'admin::roles.delete', subject: null },
          ],
        },
        {
          title: formatMessage({ id: 'Settings.permissions.menu.link.users.label' }),
          // Init the search params directly
          to: `${settingsBaseURL}/users?pageSize=10&page=1&_sort=firstname%3AASC`,
          name: 'users',
          permissions: [
            { action: 'admin::users.create', subject: null },
            { action: 'admin::users.read', subject: null },
            { action: 'admin::users.update', subject: null },
            { action: 'admin::users.delete', subject: null },
          ],
        },
      ],
    },
    ...pluginsMenu,
  ];

  return { menu, globalLinks, pluginsMenu };
};

export default useSettingsMenu;
