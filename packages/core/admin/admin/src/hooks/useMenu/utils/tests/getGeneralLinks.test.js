import { hasPermissions } from '@strapi/helper-plugin';
import getGeneralLinks from '../getGeneralLinks';

jest.mock('@strapi/helper-plugin');

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
        to: '/list-plugins',
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
        to: '/marketplace',
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
        isDisplayed: true,
        to: '/settings',
        permissions: [],
        notificationsCount: 0,
      },
    ];

    const expected = [
      {
        icon: 'list',
        label: 'app.components.LeftMenuLinkContainer.listPlugins',
        to: '/list-plugins',
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
        to: '/marketplace',
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
        isDisplayed: true,
        to: '/settings',
        permissions: [],
        notificationsCount: 0,
      },
    ];
    const actual = await getGeneralLinks(permissions, generalSectionRawLinks, false);

    expect(actual).toEqual(expected);
  });

  it('resolves an empty array when the to (/settings) is not in the authorized links', async () => {
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
        to: '/list-plugins',
        isDisplayed: false,
        permissions: [],
        notificationsCount: 0,
      },
      {
        icon: 'shopping-basket',
        label: 'app.components.LeftMenuLinkContainer.installNewPlugin',
        to: '/marketplace',
        isDisplayed: false,
        permissions: [],
        notificationsCount: 0,
      },
      {
        icon: 'cog',
        label: 'app.components.LeftMenuLinkContainer.settings',
        isDisplayed: false,
        to: '/settings',
        permissions: [],
        notificationsCount: 0,
      },
    ];

    const expected = [];
    const actual = await getGeneralLinks(permissions, generalSectionRawLinks, false);

    expect(actual).toEqual(expected);
  });
});
