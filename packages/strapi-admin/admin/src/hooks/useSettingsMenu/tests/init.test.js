import { SETTINGS_BASE_URL } from '../../../config';
import adminPermissions from '../../../permissions';
import init from '../init';

describe('ADMIN | hooks | useSettingsMenu | init', () => {
  it('should return the settings menu', () => {
    const plugins = {
      upload: {
        settings: {
          global: {
            links: [
              {
                name: 'media-library',
                permissions: [
                  {
                    action: 'plugins::upload.settings.read',
                    subject: null,
                  },
                ],
                title: { id: 'upload.plugin.name', defaultMessage: 'Media Library' },
                to: '/settings/media-library',
              },
            ],
          },
        },
      },
    };
    const initialState = {
      isLoading: true,
      menu: [],
    };
    const expected = {
      isLoading: true,
      menu: [
        {
          id: 'global',
          links: [
            {
              isDisplayed: false,
              name: 'media-library',
              permissions: [
                {
                  action: 'plugins::upload.settings.read',
                  subject: null,
                },
              ],
              title: { id: 'upload.plugin.name', defaultMessage: 'Media Library' },
              to: '/settings/media-library',
            },
            {
              isDisplayed: false,
              name: 'webhooks',
              permissions: [
                { action: 'admin::webhooks.create', subject: null },
                { action: 'admin::webhooks.read', subject: null },
                { action: 'admin::webhooks.update', subject: null },
                { action: 'admin::webhooks.delete', subject: null },
              ],
              title: { id: 'Settings.webhooks.title' },
              to: '/settings/webhooks',
            },
          ],
          title: { id: 'Settings.global' },
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
      ],
    };

    expect(init(initialState, plugins)).toEqual(expected);
  });
});
