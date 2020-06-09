import { SETTINGS_BASE_URL } from '../../../config';
import init from '../init';

describe('ADMIN | LeftMenu | init', () => {
  it('should return the initialState if the plugins are empty', () => {
    const initialState = {
      ok: true,
      generalSectionLinks: [],
    };

    expect(init(initialState)).toEqual({ ok: true, generalSectionLinks: [] });
  });

  it('should create the pluginsSectionLinks correctly', () => {
    const plugins = {
      documentation: {
        menu: {
          pluginsSectionLinks: [
            {
              destination: '/plugins/documentation',
              icon: 'doc',
              label: {
                id: 'documentation.plugin.name',
                defaultMessage: 'Documentation',
              },
              name: 'documentation',
              permissions: [{ action: 'plugins::documentation.read', subject: null }],
            },
            {
              destination: '/plugins/documentation/test',
              icon: 'doc',
              label: {
                id: 'documentation.plugin.name.test',
                defaultMessage: 'Documentation Test',
              },
              name: 'documentation test',
              permissions: [],
            },
          ],
        },
      },
      test: {},
      'content-type-builder': {
        menu: {
          pluginsSectionLinks: [
            {
              destination: '/plugins/content-type-builder',
              icon: 'plug',
              label: {
                id: 'content-type-builder.plugin.name',
                defaultMessage: 'content-type-builder',
              },
              name: 'content-type-builder',
              permissions: [{ action: 'plugins::content-type-builder.read', subject: null }],
            },
          ],
        },
      },
    };
    const initialState = {
      generalSectionLinks: [],
      pluginsSectionLinks: [],
      isLoading: true,
    };
    const expected = {
      generalSectionLinks: [],
      pluginsSectionLinks: [
        {
          destination: '/plugins/content-type-builder',
          icon: 'plug',
          label: {
            id: 'content-type-builder.plugin.name',
            defaultMessage: 'content-type-builder',
          },
          isDisplayed: false,
          permissions: [{ action: 'plugins::content-type-builder.read', subject: null }],
        },
        {
          destination: '/plugins/documentation',
          icon: 'doc',
          label: {
            id: 'documentation.plugin.name',
            defaultMessage: 'Documentation',
          },
          isDisplayed: false,
          permissions: [{ action: 'plugins::documentation.read', subject: null }],
        },
        {
          destination: '/plugins/documentation/test',
          icon: 'doc',
          label: {
            id: 'documentation.plugin.name.test',
            defaultMessage: 'Documentation Test',
          },
          isDisplayed: false,
          permissions: [],
        },
      ],
      isLoading: true,
    };

    expect(init(initialState, plugins)).toEqual(expected);
  });

  it('should set the permissions in the settings link correctly for the plugins', () => {
    const initialState = {
      generalSectionLinks: [
        {
          icon: 'list',
          label: 'app.components.LeftMenuLinkContainer.listPlugins',
          destination: '/list-plugins',
          isDisplayed: false,
          permissions: [
            { action: 'admin::marketplace.read', subject: null },
            { action: 'admin::marketplace.plugins.uninstall', subject: null },
          ],
        },
        {
          icon: 'shopping-basket',
          label: 'app.components.LeftMenuLinkContainer.installNewPlugin',
          destination: '/marketplace',
          isDisplayed: false,
          permissions: [
            { action: 'admin::marketplace.read', subject: null },
            { action: 'admin::marketplace.plugins.install', subject: null },
          ],
        },
        {
          icon: 'cog',
          label: 'app.components.LeftMenuLinkContainer.settings',
          isDisplayed: false,
          destination: SETTINGS_BASE_URL,
          permissions: [
            // webhooks
            { action: 'admin::webhook.create', subject: null },
            { action: 'admin::webhook.read', subject: null },
            { action: 'admin::webhook.update', subject: null },
            { action: 'admin::webhook.delete', subject: null },
            // users
            { action: 'admin::users.create', subject: null },
            { action: 'admin::users.read', subject: null },
            { action: 'admin::users.update', subject: null },
            { action: 'admin::users.delete', subject: null },
            // roles
            { action: 'admin::roles.create', subject: null },
            { action: 'admin::roles.update', subject: null },
            { action: 'admin::roles.read', subject: null },
            { action: 'admin::roles.delete', subject: null },
            // Here are added the plugins settings permissions during the init phase
          ],
        },
      ],
      pluginsSectionLinks: [],
      isLoading: true,
    };
    const plugins = {
      test: {
        settings: {
          global: {
            links: [
              {
                title: {
                  id: 'test.plugin.name',
                  defaultMessage: 'Test',
                },
                name: 'test',
                to: '/settings/test',
                Component: () => null,
                permissions: [{ action: 'plugins::test.settings.read', subject: null }],
              },
              {
                title: {
                  id: 'test.plugin.name1',
                  defaultMessage: 'Test1',
                },
                name: 'test1',
                to: '/settings/test1',
                Component: () => null,
                permissions: [{ action: 'plugins::test1.settings.read', subject: null }],
              },
            ],
          },
        },
      },
      other: {},
      upload: {
        settings: {
          global: {
            links: [
              {
                title: {
                  id: 'upload.plugin.name',
                  defaultMessage: 'Media Library',
                },
                name: 'media-library',
                to: 'settings/media-library',
                Component: () => null,
                permissions: [
                  { action: 'plugins::upload.settings.read', subject: null },
                  { action: 'plugins::upload.settings.read.test', subject: null },
                ],
              },
            ],
          },
        },
      },
    };
    const expected = {
      generalSectionLinks: [
        {
          icon: 'list',
          label: 'app.components.LeftMenuLinkContainer.listPlugins',
          destination: '/list-plugins',
          isDisplayed: false,
          permissions: [
            { action: 'admin::marketplace.read', subject: null },
            { action: 'admin::marketplace.plugins.uninstall', subject: null },
          ],
        },
        {
          icon: 'shopping-basket',
          label: 'app.components.LeftMenuLinkContainer.installNewPlugin',
          destination: '/marketplace',
          isDisplayed: false,
          permissions: [
            { action: 'admin::marketplace.read', subject: null },
            { action: 'admin::marketplace.plugins.install', subject: null },
          ],
        },
        {
          icon: 'cog',
          label: 'app.components.LeftMenuLinkContainer.settings',
          isDisplayed: false,
          destination: SETTINGS_BASE_URL,
          permissions: [
            // webhooks
            { action: 'admin::webhook.create', subject: null },
            { action: 'admin::webhook.read', subject: null },
            { action: 'admin::webhook.update', subject: null },
            { action: 'admin::webhook.delete', subject: null },
            // users
            { action: 'admin::users.create', subject: null },
            { action: 'admin::users.read', subject: null },
            { action: 'admin::users.update', subject: null },
            { action: 'admin::users.delete', subject: null },
            // roles
            { action: 'admin::roles.create', subject: null },
            { action: 'admin::roles.update', subject: null },
            { action: 'admin::roles.read', subject: null },
            { action: 'admin::roles.delete', subject: null },
            { action: 'plugins::test.settings.read', subject: null },
            { action: 'plugins::test1.settings.read', subject: null },
            { action: 'plugins::upload.settings.read', subject: null },
            { action: 'plugins::upload.settings.read.test', subject: null },
          ],
        },
      ],
      pluginsSectionLinks: [],
      isLoading: true,
    };

    expect(init(initialState, plugins)).toEqual(expected);
  });
});
