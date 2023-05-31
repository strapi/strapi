import { hasPermissions } from '@strapi/helper-plugin';
import getGeneralLinks from '../getGeneralLinks';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  hasPermissions: jest.fn().mockResolvedValue(true),
}));

describe('getGeneralLinks', () => {
  it('resolves valid general links from real data', async () => {
    const permissions = [
      {
        id: 458,
        action: 'plugin::i18n.locale.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        id: 459,
        action: 'plugin::content-manager.explorer.create',
        subject: 'api::article.article',
        properties: {
          fields: ['Name'],
          locales: ['en'],
        },
        conditions: [],
      },
      {
        id: 460,
        action: 'plugin::content-manager.explorer.read',
        subject: 'api::article.article',
        properties: {
          fields: ['Name'],
          locales: ['en'],
        },
        conditions: [],
      },
      {
        id: 461,
        action: 'plugin::content-manager.explorer.read',
        subject: 'api::article.article',
        properties: {
          fields: ['Name'],
          locales: ['fr-FR'],
        },
        conditions: [],
      },
      {
        id: 462,
        action: 'plugin::content-manager.explorer.update',
        subject: 'api::article.article',
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
        action: 'plugin::i18n.locale.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        id: 459,
        action: 'plugin::content-manager.explorer.create',
        subject: 'api::article.article',
        properties: {
          fields: ['Name'],
          locales: ['en'],
        },
        conditions: [],
      },
      {
        id: 460,
        action: 'plugin::content-manager.explorer.read',
        subject: 'api::article.article',
        properties: {
          fields: ['Name'],
          locales: ['en'],
        },
        conditions: [],
      },
      {
        id: 461,
        action: 'plugin::content-manager.explorer.read',
        subject: 'api::article.article',
        properties: {
          fields: ['Name'],
          locales: ['fr-FR'],
        },
        conditions: [],
      },
      {
        id: 462,
        action: 'plugin::content-manager.explorer.update',
        subject: 'api::article.article',
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
