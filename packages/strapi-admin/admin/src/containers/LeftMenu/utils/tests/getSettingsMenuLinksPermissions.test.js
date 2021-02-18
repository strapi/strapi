import getSettingsMenuLinksPermissions from '../getSettingsMenuLinksPermissions';

describe('ADMIN | LeftMenu | utils | getSettingsMenuLinksPermissions', () => {
  it('should return an array containing all the permissions of each link', () => {
    const data = [
      {
        id: 'global',
        title: { id: 'Settings.global' },
        links: [
          {
            title: 'Settings.webhooks.title',
            to: '/settings/webhooks',
            name: 'webhooks',
            permissions: [
              { action: 'admin::webhook.create', subject: null },
              { action: 'admin::webhook.read', subject: null },
              { action: 'admin::webhook.update', subject: null },
              { action: 'admin::webhook.delete', subject: null },
            ],
          },
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
      {
        id: 'permissions',
        title: 'Settings.permissions',
        links: [
          {
            title: 'roles',
            to: '/settings/roles',
            name: 'roles',
            permissions: [
              { action: 'admin::roles.create', subject: null },
              { action: 'admin::roles.update', subject: null },
              { action: 'admin::roles.read', subject: null },
              { action: 'admin::roles.delete', subject: null },
            ],
          },
          {
            title: 'users',

            to: '/settings/users?pageSize=10&page=1&_sort=firstname%3AASC',
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
    ];

    const expected = [
      { action: 'admin::webhook.create', subject: null },
      { action: 'admin::webhook.read', subject: null },
      { action: 'admin::webhook.update', subject: null },
      { action: 'admin::webhook.delete', subject: null },
      {
        action: 'plugins::upload.settings.read',
        subject: null,
      },
      { action: 'admin::roles.create', subject: null },
      { action: 'admin::roles.update', subject: null },
      { action: 'admin::roles.read', subject: null },
      { action: 'admin::roles.delete', subject: null },
      { action: 'admin::users.create', subject: null },
      { action: 'admin::users.read', subject: null },
      { action: 'admin::users.update', subject: null },
      { action: 'admin::users.delete', subject: null },
    ];

    expect(getSettingsMenuLinksPermissions(data)).toEqual(expected);
  });
});
