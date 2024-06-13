import { render } from '@testing-library/react';

import { StrapiApp } from '../StrapiApp';

describe('ADMIN | new StrapiApp', () => {
  it('should render the app without plugins', async () => {
    const app = new StrapiApp();
    const { findByRole } = render(app.render());

    await findByRole('combobox');
  });

  describe('Hook api', () => {
    it('runs the "moto" hooks in series', () => {
      const app = new StrapiApp();

      app.createHook('hello');
      app.createHook('moto');

      app.registerHook('hello', () => 5);
      app.registerHook('moto', () => 1);
      app.registerHook('moto', () => 2);
      app.registerHook('moto', () => 3);

      // @ts-expect-error – the type could be written better to infer asynchronous behaviour
      const [a, b, c] = app.runHookSeries('moto');

      expect(a).toBe(1);
      expect(b).toBe(2);
      expect(c).toBe(3);
    });

    it('runs the "moto" hooks in series asynchronously', async () => {
      const app = new StrapiApp();

      app.createHook('hello');
      app.createHook('moto');

      app.registerHook('hello', () => Promise.resolve(5));
      app.registerHook('moto', () => 1);
      app.registerHook('moto', () => 2);
      app.registerHook('moto', () => 3);

      const [a, b, c] = await app.runHookSeries('moto', true);

      expect(a).toBe(1);
      expect(b).toBe(2);
      expect(c).toBe(3);
    });

    it('runs the "moto" hooks in waterfall', () => {
      const app = new StrapiApp();

      app.createHook('hello');
      app.createHook('moto');

      app.registerHook('hello', () => 5);
      app.registerHook('moto', (n) => n + 1);
      app.registerHook('moto', (n) => n + 2);
      app.registerHook('moto', (n) => n + 3);

      const res = app.runHookWaterfall('moto', 1);

      expect(res).toBe(7);
    });

    it('runs the "moto" hooks in parallel', async () => {
      const app = new StrapiApp();

      app.createHook('hello');
      app.createHook('moto');

      app.registerHook('hello', () => 5);
      app.registerHook('moto', () => 1);
      app.registerHook('moto', () => 2);
      app.registerHook('moto', () => 3);

      const [a, b, c] = await app.runHookParallel('moto');

      expect(a).toBe(1);
      expect(b).toBe(2);
      expect(c).toBe(3);
    });
  });

  describe('Settings api', () => {
    it('the settings should be defined', () => {
      const app = new StrapiApp();

      expect(app.router.settings).toBeDefined();
      expect(app.router.settings.global).toBeDefined();
    });

    it('should creates a new section', () => {
      const app = new StrapiApp();
      const section = { id: 'foo', intlLabel: { id: 'foo', defaultMessage: 'foo' }, links: [] };
      const links = [
        {
          Component: jest.fn(),
          to: 'bar',
          id: 'bar',
          intlLabel: { id: 'bar', defaultMessage: 'bar' },
          permissions: [],
        },
      ];
      app.createSettingSection(section, links);

      expect(app.router.settings.foo).toBeDefined();
      expect(app.router.settings.foo.links).toMatchInlineSnapshot(`[]`);
    });

    it('should add a link correctly to the global section', () => {
      const app = new StrapiApp();
      const link = {
        Component: jest.fn(),
        to: 'bar',
        id: 'bar',
        intlLabel: { id: 'bar', defaultMessage: 'bar' },
        permissions: [],
      };

      app.addSettingsLink('global', link);

      expect(app.router.settings.global.links).toHaveLength(1);
      expect(app.router.settings.global.links[0]).toMatchInlineSnapshot(`
        {
          "id": "bar",
          "intlLabel": {
            "defaultMessage": "bar",
            "id": "bar",
          },
          "permissions": [],
          "to": "bar",
        }
      `);
    });

    it('should add an array of links correctly to the global section', () => {
      const app = new StrapiApp();
      const links = [
        {
          Component: jest.fn(),
          to: 'bar',
          id: 'bar',
          intlLabel: { id: 'bar', defaultMessage: 'bar' },
          permissions: [],
        },
      ];

      app.addSettingsLinks('global', links);

      expect(app.router.settings.global.links).toHaveLength(1);
      expect(app.router.settings.global.links).toMatchInlineSnapshot(`
        [
          {
            "id": "bar",
            "intlLabel": {
              "defaultMessage": "bar",
              "id": "bar",
            },
            "permissions": [],
            "to": "bar",
          },
        ]
      `);
    });

    it('should warn if a user supplies an absolute link', () => {
      const originalWarn = console.warn;
      const consoleSpy = jest.fn();
      console.warn = consoleSpy;

      const app = new StrapiApp();

      const links = [
        {
          Component: jest.fn(),
          to: '/bar',
          id: 'bar',
          intlLabel: { id: 'bar', defaultMessage: 'bar' },
          permissions: [],
        },
      ];

      app.addSettingsLinks('global', links);

      expect(consoleSpy.mock.calls[0]).toMatchInlineSnapshot(`
        [
          "[bar]: the \`to\` property of your settings link is an absolute path. It should be relative to \`/settings\`. This has been corrected for you but will be removed in a future version of Strapi.",
        ]
      `);

      console.warn = originalWarn;
    });

    it('should warn if a user supplies an async component', () => {
      const originalWarn = console.warn;
      const consoleSpy = jest.fn();
      console.warn = consoleSpy;

      const app = new StrapiApp();

      const links = [
        {
          Component: async () => ({ default: jest.fn() }),
          to: 'bar',
          id: 'bar',
          intlLabel: { id: 'bar', defaultMessage: 'bar' },
          permissions: [],
        },
      ];

      app.addSettingsLinks('global', links);

      expect(consoleSpy.mock.calls[0]).toMatchInlineSnapshot(`
        [
          "[bar]: [deprecated] addSettingsLink() was called with an async Component from the plugin "bar". This will be removed in the future. Please use: \`Component: () => import(path)\` ensuring you return a default export instead.",
        ]
      `);

      console.warn = originalWarn;
    });
  });

  describe('Custom fields api', () => {
    it('should register a custom field', () => {
      const app = new StrapiApp();
      const field = {
        name: 'pluginCustomField',
        pluginId: 'myplugin',
        type: 'text',
        icon: jest.fn(),
        intlLabel: { id: 'foo', defaultMessage: 'foo' },
        intlDescription: { id: 'foo', defaultMessage: 'foo' },
        components: {
          Input: jest.fn(),
        },
      } as const;

      app.customFields.register(field);
      expect(app.customFields.get('plugin::myplugin.pluginCustomField')).toEqual(field);
      expect(app.customFields.getAll()).toEqual({
        'plugin::myplugin.pluginCustomField': field,
      });
    });

    it('should register a custom field with valid options', () => {
      const app = new StrapiApp();
      const field = {
        name: 'optionsCustomField',
        pluginId: 'myplugin',
        type: 'text',
        icon: jest.fn(),
        intlLabel: { id: 'foo', defaultMessage: 'foo' },
        intlDescription: { id: 'foo', defaultMessage: 'foo' },
        components: {
          Input: jest.fn(),
        },
        options: {
          base: [{ name: 'regex' }],
          advanced: [
            { name: 'options.plop' },
            { name: 'required' },
            { sectionTitle: null, items: [{ name: 'options.deep' }] },
            { sectionTitle: null, items: [{ name: 'private' }] },
          ],
        },
      };

      // @ts-expect-error - test
      app.customFields.register(field);
      expect(app.customFields.get('plugin::myplugin.optionsCustomField')).toEqual(field);
    });

    it('should register several custom fields at once', () => {
      const app = new StrapiApp();
      const fields = [
        {
          name: 'field1',
          pluginId: 'myplugin',
          type: 'text',
          icon: jest.fn(),
          intlLabel: { id: 'foo', defaultMessage: 'foo' },
          intlDescription: { id: 'foo', defaultMessage: 'foo' },
          components: {
            Input: jest.fn(),
          },
        },
        {
          name: 'field2',
          pluginId: 'myplugin',
          type: 'text',
          icon: jest.fn(),
          intlLabel: { id: 'foo', defaultMessage: 'foo' },
          intlDescription: { id: 'foo', defaultMessage: 'foo' },
          components: {
            Input: jest.fn(),
          },
        },
      ];

      // @ts-expect-error - test
      app.customFields.register(fields);
      expect(app.customFields.get('plugin::myplugin.field1')).toEqual(fields[0]);
      expect(app.customFields.get('plugin::myplugin.field2')).toEqual(fields[1]);
    });

    it('should register a custom field without pluginId', () => {
      const app = new StrapiApp();
      const field = {
        name: 'appCustomField',
        type: 'text',
        icon: jest.fn(),
        intlLabel: { id: 'foo', defaultMessage: 'foo' },
        intlDescription: { id: 'foo', defaultMessage: 'foo' },
        components: {
          Input: jest.fn(),
        },
      };

      // @ts-expect-error - test
      app.customFields.register(field);
      const uid = 'global::appCustomField';
      expect(app.customFields.get(uid)).toEqual(field);
    });

    it('should prevent registering same custom field twice', () => {
      const app = new StrapiApp();
      const field = {
        name: 'redundantCustomField',
        pluginId: 'myplugin',
        type: 'text',
        icon: jest.fn(),
        intlLabel: { id: 'foo', defaultMessage: 'foo' },
        intlDescription: { id: 'foo', defaultMessage: 'foo' },
        components: {
          Input: jest.fn(),
        },
      };

      // Second register call should throw
      // @ts-expect-error - test
      app.customFields.register(field);
      // @ts-expect-error - test
      expect(() => app.customFields.register(field)).toThrowError(
        "Custom field: 'plugin::myplugin.redundantCustomField' has already been registered"
      );
    });

    it('should validate the name can be used as an object key', () => {
      const app = new StrapiApp();
      const field = {
        name: 'test.boom',
        pluginId: 'myplugin',
        type: 'text',
        intlLabel: { id: 'foo', defaultMessage: 'foo' },
        intlDescription: { id: 'foo', defaultMessage: 'foo' },
        components: {
          Input: jest.fn(),
        },
      };

      // @ts-expect-error - test
      expect(() => app.customFields.register(field)).toThrowError(
        "Custom field name: 'test.boom' is not a valid object key"
      );
    });

    it('should prevent registering incomplete custom field', () => {
      const app = new StrapiApp();
      const field = {
        name: 'incompleteCustomField',
        pluginId: 'myplugin',
      };

      // @ts-expect-error - test
      expect(() => app.customFields.register(field)).toThrowError(/(a|an) .* must be provided/i);
    });

    it('should validate option path names', () => {
      const app = new StrapiApp();
      const field = {
        name: 'test',
        pluginId: 'myplugin',
        type: 'text',
        intlLabel: { id: 'foo', defaultMessage: 'foo' },
        intlDescription: { id: 'foo', defaultMessage: 'foo' },
        components: {
          Input: jest.fn(),
        },
        options: {
          base: [{ name: 'regex' }],
          advanced: [{ name: 'plop' }],
        },
      };

      // Test shallow value
      // @ts-expect-error - test
      expect(() => app.customFields.register(field)).toThrowError(
        "'plop' must be prefixed with 'options.'"
      );
      // Test deep value
      // @ts-expect-error - test
      field.options.advanced = [{ sectionTitle: null, items: [{ name: 'deep.plop' }] }];
      // @ts-expect-error - test
      expect(() => app.customFields.register(field)).toThrowError(
        "'deep.plop' must be prefixed with 'options.'"
      );
    });

    it('requires options to have a name property', () => {
      const app = new StrapiApp();
      const field = {
        name: 'test',
        pluginId: 'myplugin',
        type: 'text',
        intlLabel: { id: 'foo', defaultMessage: 'foo' },
        intlDescription: { id: 'foo', defaultMessage: 'foo' },
        components: {
          Input: jest.fn(),
        },
        options: {
          base: [{ name: 'regex' }],
          advanced: [{ boom: 'kapow' }],
        },
      };

      // @ts-expect-error - test
      expect(() => app.customFields.register(field)).toThrowError(
        "The 'name' property is required on an options object"
      );
    });
  });

  describe('Menu api', () => {
    it('the menu should be defined', () => {
      const app = new StrapiApp();

      expect(app.router.menu).toBeDefined();
      expect(Array.isArray(app.router.menu)).toBe(true);
    });

    it('addMenuLink should add a link to the menu', () => {
      const app = new StrapiApp();
      const link = {
        Component: jest.fn(),
        to: 'plugins/bar',
        intlLabel: { id: 'bar', defaultMessage: 'bar' },
        permissions: [],
        icon: () => <>{'book'}</>,
      };

      app.addMenuLink(link);

      expect(app.router.menu[0]).toBeDefined();
      expect(app.router.menu[0]).toMatchInlineSnapshot(`
        {
          "icon": [Function],
          "intlLabel": {
            "defaultMessage": "bar",
            "id": "bar",
          },
          "permissions": [],
          "to": "plugins/bar",
        }
      `);
    });

    it('should warn if a user supplies an absolute link', () => {
      const originalWarn = console.warn;
      const consoleSpy = jest.fn();
      console.warn = consoleSpy;

      const app = new StrapiApp();

      const link = {
        Component: jest.fn(),
        to: '/bar',
        id: 'bar',
        intlLabel: { id: 'bar', defaultMessage: 'bar' },
        permissions: [],
        icon: jest.fn(),
      };

      app.addMenuLink(link);

      expect(consoleSpy.mock.calls[0]).toMatchInlineSnapshot(`
        [
          "[bar]: the \`to\` property of your menu link is an absolute path, it should be relative to the root of the application. This has been corrected for you but will be removed in a future version of Strapi.",
        ]
      `);

      console.warn = originalWarn;
    });

    it('should warn if a user supplies an async component', () => {
      const originalWarn = console.warn;
      const consoleSpy = jest.fn();
      console.warn = consoleSpy;

      const app = new StrapiApp();

      const link = {
        Component: async () => ({ default: jest.fn() }),
        to: 'bar',
        id: 'bar',
        intlLabel: { id: 'bar', defaultMessage: 'bar' },
        permissions: [],
        icon: jest.fn(),
      };

      app.addMenuLink(link);

      expect(consoleSpy.mock.calls[0]).toMatchInlineSnapshot(`
        [
          "[bar]: [deprecated] addMenuLink() was called with an async Component from the plugin "bar". This will be removed in the future. Please use: \`Component: () => import(path)\` ensuring you return a default export instead.",
        ]
      `);

      console.warn = originalWarn;
    });
  });

  describe('createCustomConfigurations', () => {
    it('should add a locale', () => {
      const app = new StrapiApp({ config: { locales: ['fr'] } });

      expect(app.configurations.locales).toEqual(['en', 'fr']);
    });

    it('should override the authLogo', () => {
      const app = new StrapiApp({ config: { auth: { logo: 'fr' } } });

      expect(app.configurations.authLogo).toBe('fr');
    });

    it('should override the menuLogo', () => {
      const app = new StrapiApp({ config: { menu: { logo: 'fr' } } });

      expect(app.configurations.menuLogo).toBe('fr');
    });

    it('should override the favicon', () => {
      const app = new StrapiApp({ config: { head: { favicon: 'fr' } } });

      expect(app.configurations.head.favicon).toBe('fr');
    });

    it('should override the light theme', () => {
      // @ts-expect-error - test mocks
      const app = new StrapiApp({ config: { theme: { light: { colors: { red: 'black' } } } } });

      // @ts-expect-error - test mocks
      expect(app.configurations.themes.light.colors.red).toBe('black');
    });

    it('should override the dark theme', () => {
      // @ts-expect-error - test mocks
      const app = new StrapiApp({ config: { theme: { dark: { colors: { red: 'black' } } } } });

      // @ts-expect-error - test mocks
      expect(app.configurations.themes.dark.colors.red).toBe('black');
    });

    it('should override the light theme with a legacy syntax (without light or dark keys) and log a warning', () => {
      const origalConsoleWarning = console.warn;

      console.warn = jest.fn();

      // @ts-expect-error - test mocks
      const app = new StrapiApp({ config: { theme: { colors: { red: 'black' } } } });

      // @ts-expect-error - test mocks
      expect(app.configurations.themes.light.colors.red).toBe('black');
      expect(console.warn).toBeCalledTimes(1);

      console.warn = origalConsoleWarning;
    });

    it('should override the tutorials', () => {
      const app = new StrapiApp({ config: { tutorials: false } });

      expect(app.configurations.tutorials).toBeFalsy();
    });

    it('should override the release notification', () => {
      const app = new StrapiApp({ config: { notifications: { releases: false } } });

      expect(app.configurations.notifications.releases).toBeFalsy();
    });
  });
});
