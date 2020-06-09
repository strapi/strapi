import reducer from '../reducer';

describe('ADMIN | LeftMenu | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const state = {
        test: true,
      };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('TOGGLE_IS_LOADING', () => {
    it('should change the isLoading property correctly', () => {
      const state = {
        isLoading: true,
        ok: true,
      };
      const expected = {
        isLoading: false,
        ok: true,
      };
      const action = {
        type: 'TOGGLE_IS_LOADING',
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SET_LINK_PERMISSIONS', () => {
    it('should set the isDisplayed property correctly', () => {
      const state = {
        isLoading: true,
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
            destination: '/test',
            permissions: [],
          },
        ],
        pluginsSectionLinks: [
          {
            destination: '/plugins/content-type-builder',
            icon: 'paint-brush',
            isDisplayed: false,
            label: {
              id: 'content-type-builder.plugin.name',
              defaultMessage: 'Content-Types Builder',
            },
            permissions: [
              {
                action: 'plugins::content-type-builder.read',
                subject: null,
              },
            ],
          },
          {
            destination: '/plugins/documentation',
            icon: 'book',
            isDisplayed: false,
            label: { id: 'documentation.plugin.name', defaultMessage: 'Documentation' },
            permissions: [
              { action: 'plugins::documentation.read', subject: null },
              { action: 'plugins::documentation.regenerate', subject: null },
              { action: 'plugins::documentation.update', subject: null },
            ],
          },
        ],
      };
      const action = {
        type: 'SET_LINK_PERMISSIONS',
        data: {
          generalSectionLinks: [
            {
              index: 1,
              hasPermission: true,
            },
            {
              index: 0,
              hasPermission: false,
            },
            {
              index: 2,
              hasPermission: true,
            },
          ],
          pluginsSectionLinks: [
            {
              index: 0,
              hasPermission: true,
            },
          ],
        },
      };

      const expected = {
        isLoading: true,
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
            isDisplayed: true,
            permissions: [
              { action: 'admin::marketplace.read', subject: null },
              { action: 'admin::marketplace.plugins.install', subject: null },
            ],
          },
          {
            icon: 'cog',
            label: 'app.components.LeftMenuLinkContainer.settings',
            isDisplayed: true,
            destination: '/test',
            permissions: [],
          },
        ],
        pluginsSectionLinks: [
          {
            destination: '/plugins/content-type-builder',
            icon: 'paint-brush',
            isDisplayed: true,
            label: {
              id: 'content-type-builder.plugin.name',
              defaultMessage: 'Content-Types Builder',
            },
            permissions: [
              {
                action: 'plugins::content-type-builder.read',
                subject: null,
              },
            ],
          },
          {
            destination: '/plugins/documentation',
            icon: 'book',
            isDisplayed: false,
            label: { id: 'documentation.plugin.name', defaultMessage: 'Documentation' },
            permissions: [
              { action: 'plugins::documentation.read', subject: null },
              { action: 'plugins::documentation.regenerate', subject: null },
              { action: 'plugins::documentation.update', subject: null },
            ],
          },
        ],
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
