import { hasPermissions } from 'strapi-helper-plugin';
import getGeneralLinks from '../getGeneralLinks';

jest.mock('strapi-helper-plugin');

describe('getGeneralLinks', () => {
  it('resolves valid general links from real data', async () => {
    hasPermissions.mockImplementation(() => Promise.resolve(true));

    const permissions = [
      {
        id: 458,
        action: 'plugins::i18n.locale.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        id: 459,
        action: 'plugins::content-manager.explorer.create',
        subject: 'application::article.article',
        properties: {
          fields: ['Name'],
          locales: ['en'],
        },
        conditions: [],
      },
      {
        id: 460,
        action: 'plugins::content-manager.explorer.read',
        subject: 'application::article.article',
        properties: {
          fields: ['Name'],
          locales: ['en'],
        },
        conditions: [],
      },
      {
        id: 461,
        action: 'plugins::content-manager.explorer.read',
        subject: 'application::article.article',
        properties: {
          fields: ['Name'],
          locales: ['fr-FR'],
        },
        conditions: [],
      },
      {
        id: 462,
        action: 'plugins::content-manager.explorer.update',
        subject: 'application::article.article',
        properties: {
          fields: ['Name'],
          locales: ['fr-FR'],
        },
        conditions: [],
      },
    ];
    const generalSectionRawLinks = [
      {
        icon: 'list',
        label: 'app.components.LeftMenuLinkContainer.listPlugins',
        destination: '/list-plugins',
        isDisplayed: false,
        permissions: [
          {
            action: 'admin::marketplace.read',
            subject: null,
          },
          {
            action: 'admin::marketplace.plugins.install',
            subject: null,
          },
          {
            action: 'admin::marketplace.plugins.uninstall',
            subject: null,
          },
        ],
        notificationsCount: 0,
      },
      {
        icon: 'shopping-basket',
        label: 'app.components.LeftMenuLinkContainer.installNewPlugin',
        destination: '/marketplace',
        isDisplayed: false,
        permissions: [
          {
            action: 'admin::marketplace.read',
            subject: null,
          },
          {
            action: 'admin::marketplace.plugins.install',
            subject: null,
          },
          {
            action: 'admin::marketplace.plugins.uninstall',
            subject: null,
          },
        ],
        notificationsCount: 0,
      },
      {
        icon: 'cog',
        label: 'app.components.LeftMenuLinkContainer.settings',
        isDisplayed: false,
        destination: '/settings',
        permissions: [],
        notificationsCount: 0,
      },
    ];

    const settingsMenu = [
      {
        id: 'global',
        title: {
          id: 'Settings.global',
        },
        links: [
          {
            title: {
              id: 'i18n.plugin.name',
              defaultMessage: 'Internationalization',
            },
            name: 'internationalization',
            to: '/settings/internationalization',
            permissions: [
              {
                action: 'plugins::i18n.locale.read',
                subject: null,
              },
              {
                action: 'plugins::i18n.locale.create',
                subject: null,
              },
            ],
            isDisplayed: false,
          },
          {
            title: {
              id: 'upload.plugin.name',
              defaultMessage: 'Media Library',
            },
            name: 'media-library',
            to: '/settings/media-library',
            permissions: [
              {
                action: 'plugins::upload.settings.read',
                subject: null,
              },
            ],
            isDisplayed: false,
          },
          {
            title: {
              id: 'Settings.sso.title',
            },
            to: '/settings/single-sign-on',
            name: 'sso',
            isDisplayed: false,
            permissions: [
              {
                action: 'admin::provider-login.read',
                subject: null,
              },
            ],
          },
          {
            title: {
              id: 'Settings.webhooks.title',
            },
            to: '/settings/webhooks',
            name: 'webhooks',
            isDisplayed: false,
            permissions: [
              {
                action: 'admin::webhooks.create',
                subject: null,
              },
              {
                action: 'admin::webhooks.read',
                subject: null,
              },
              {
                action: 'admin::webhooks.update',
                subject: null,
              },
              {
                action: 'admin::webhooks.delete',
                subject: null,
              },
            ],
          },
        ],
      },
      {
        id: 'permissions',
        title: 'Settings.permissions',
        links: [
          {
            title: {
              id: 'Settings.permissions.menu.link.roles.label',
            },
            to: '/settings/roles',
            name: 'roles',
            isDisplayed: false,
            permissions: [
              {
                action: 'admin::roles.create',
                subject: null,
              },
              {
                action: 'admin::roles.update',
                subject: null,
              },
              {
                action: 'admin::roles.read',
                subject: null,
              },
              {
                action: 'admin::roles.delete',
                subject: null,
              },
            ],
          },
          {
            title: {
              id: 'Settings.permissions.menu.link.users.label',
            },
            to: '/settings/users?pageSize=10&page=1&_sort=firstname%3AASC',
            name: 'users',
            isDisplayed: false,
            permissions: [
              {
                action: 'admin::users.create',
                subject: null,
              },
              {
                action: 'admin::users.read',
                subject: null,
              },
              {
                action: 'admin::users.update',
                subject: null,
              },
              {
                action: 'admin::users.delete',
                subject: null,
              },
            ],
          },
        ],
      },
    ];

    const expected = [
      {
        icon: 'list',
        label: 'app.components.LeftMenuLinkContainer.listPlugins',
        destination: '/list-plugins',
        isDisplayed: false,
        permissions: [
          {
            action: 'admin::marketplace.read',
            subject: null,
          },
          {
            action: 'admin::marketplace.plugins.install',
            subject: null,
          },
          {
            action: 'admin::marketplace.plugins.uninstall',
            subject: null,
          },
        ],
        notificationsCount: 0,
      },
      {
        icon: 'shopping-basket',
        label: 'app.components.LeftMenuLinkContainer.installNewPlugin',
        destination: '/marketplace',
        isDisplayed: false,
        permissions: [
          {
            action: 'admin::marketplace.read',
            subject: null,
          },
          {
            action: 'admin::marketplace.plugins.install',
            subject: null,
          },
          {
            action: 'admin::marketplace.plugins.uninstall',
            subject: null,
          },
        ],
        notificationsCount: 0,
      },
      {
        icon: 'cog',
        label: 'app.components.LeftMenuLinkContainer.settings',
        isDisplayed: false,
        destination: '/settings',
        permissions: [
          {
            action: 'plugins::i18n.locale.read',
            subject: null,
          },
          {
            action: 'plugins::i18n.locale.create',
            subject: null,
          },
          {
            action: 'plugins::upload.settings.read',
            subject: null,
          },
          {
            action: 'admin::provider-login.read',
            subject: null,
          },
          {
            action: 'admin::webhooks.create',
            subject: null,
          },
          {
            action: 'admin::webhooks.read',
            subject: null,
          },
          {
            action: 'admin::webhooks.update',
            subject: null,
          },
          {
            action: 'admin::webhooks.delete',
            subject: null,
          },
          {
            action: 'admin::roles.create',
            subject: null,
          },
          {
            action: 'admin::roles.update',
            subject: null,
          },
          {
            action: 'admin::roles.read',
            subject: null,
          },
          {
            action: 'admin::roles.delete',
            subject: null,
          },
          {
            action: 'admin::users.create',
            subject: null,
          },
          {
            action: 'admin::users.read',
            subject: null,
          },
          {
            action: 'admin::users.update',
            subject: null,
          },
          {
            action: 'admin::users.delete',
            subject: null,
          },
        ],
        notificationsCount: 0,
        notificationCount: 0,
      },
    ];
    const actual = await getGeneralLinks(permissions, generalSectionRawLinks, settingsMenu, false);

    expect(actual).toEqual(expected);
  });

  it('resolves an empty array when the SETTINGS_BASE_URL is not in the authorized links', async () => {
    hasPermissions.mockImplementation(() => Promise.resolve(false));

    const permissions = [
      {
        id: 458,
        action: 'plugins::i18n.locale.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        id: 459,
        action: 'plugins::content-manager.explorer.create',
        subject: 'application::article.article',
        properties: {
          fields: ['Name'],
          locales: ['en'],
        },
        conditions: [],
      },
      {
        id: 460,
        action: 'plugins::content-manager.explorer.read',
        subject: 'application::article.article',
        properties: {
          fields: ['Name'],
          locales: ['en'],
        },
        conditions: [],
      },
      {
        id: 461,
        action: 'plugins::content-manager.explorer.read',
        subject: 'application::article.article',
        properties: {
          fields: ['Name'],
          locales: ['fr-FR'],
        },
        conditions: [],
      },
      {
        id: 462,
        action: 'plugins::content-manager.explorer.update',
        subject: 'application::article.article',
        properties: {
          fields: ['Name'],
          locales: ['fr-FR'],
        },
        conditions: [],
      },
    ];
    const generalSectionRawLinks = [
      {
        icon: 'list',
        label: 'app.components.LeftMenuLinkContainer.listPlugins',
        destination: '/list-plugins',
        isDisplayed: false,
        permissions: [],
        notificationsCount: 0,
      },
      {
        icon: 'shopping-basket',
        label: 'app.components.LeftMenuLinkContainer.installNewPlugin',
        destination: '/marketplace',
        isDisplayed: false,
        permissions: [],
        notificationsCount: 0,
      },
      {
        icon: 'cog',
        label: 'app.components.LeftMenuLinkContainer.settings',
        isDisplayed: false,
        destination: '/settings',
        permissions: [],
        notificationsCount: 0,
      },
    ];

    const settingsMenu = [
      {
        id: 'global',
        title: {
          id: 'Settings.global',
        },
        links: [
          {
            title: {
              id: 'i18n.plugin.name',
              defaultMessage: 'Internationalization',
            },
            name: 'internationalization',
            to: '/settings/internationalization',
            permissions: [
              {
                action: 'plugins::i18n.locale.read',
                subject: null,
              },
              {
                action: 'plugins::i18n.locale.create',
                subject: null,
              },
            ],
            isDisplayed: false,
          },
          {
            title: {
              id: 'upload.plugin.name',
              defaultMessage: 'Media Library',
            },
            name: 'media-library',
            to: '/settings/media-library',
            permissions: [
              {
                action: 'plugins::upload.settings.read',
                subject: null,
              },
            ],
            isDisplayed: false,
          },
          {
            title: {
              id: 'Settings.sso.title',
            },
            to: '/settings/single-sign-on',
            name: 'sso',
            isDisplayed: false,
            permissions: [],
          },
          {
            title: {
              id: 'Settings.webhooks.title',
            },
            to: '/settings/webhooks',
            name: 'webhooks',
            isDisplayed: false,
            permissions: [],
          },
        ],
      },
      {
        id: 'permissions',
        title: 'Settings.permissions',
        links: [
          {
            title: {
              id: 'Settings.permissions.menu.link.roles.label',
            },
            to: '/settings/roles',
            name: 'roles',
            isDisplayed: false,
            permissions: [],
          },
          {
            title: {
              id: 'Settings.permissions.menu.link.users.label',
            },
            to: '/settings/users?pageSize=10&page=1&_sort=firstname%3AASC',
            name: 'users',
            isDisplayed: false,
            permissions: [],
          },
        ],
      },
    ];

    const expected = [];
    const actual = await getGeneralLinks(permissions, generalSectionRawLinks, settingsMenu, false);

    expect(actual).toEqual(expected);
  });
});
