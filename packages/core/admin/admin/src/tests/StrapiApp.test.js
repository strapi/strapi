import { render } from '@testing-library/react';
import { fixtures } from '@strapi/admin-test-utils';
import { Components, Fields } from '../core/apis';
import StrapiApp from '../StrapiApp';
import appReducers from '../reducers';

const library = { fields: Fields(), components: Components() };
const middlewares = { middlewares: [] };
const reducers = { reducers: appReducers };

describe('ADMIN | StrapiApp', () => {
  it('should render the app without plugins', () => {
    const app = StrapiApp({ middlewares, reducers, library });
    const { container } = render(app.render());

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should create a valid store', () => {
    const app = StrapiApp({ middlewares, reducers, library });

    const store = app.createStore();

    expect(store.getState()).toEqual(fixtures.store.state);
  });

  describe('Hook api', () => {
    it('runs the "moto" hooks in series', () => {
      const app = StrapiApp({ middlewares, reducers, library });

      app.createHook('hello');
      app.createHook('moto');

      app.registerHook('hello', () => 5);
      app.registerHook('moto', () => 1);
      app.registerHook('moto', () => 2);
      app.registerHook('moto', () => 3);

      const [a, b, c] = app.runHookSeries('moto');

      expect(a).toBe(1);
      expect(b).toBe(2);
      expect(c).toBe(3);
    });

    it('runs the "moto" hooks in series asynchronously', async () => {
      const app = StrapiApp({ middlewares, reducers, library });

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
      const app = StrapiApp({ middlewares, reducers, library });

      app.createHook('hello');
      app.createHook('moto');

      app.registerHook('hello', () => 5);
      app.registerHook('moto', (n) => n + 1);
      app.registerHook('moto', (n) => n + 2);
      app.registerHook('moto', (n) => n + 3);

      const res = app.runHookWaterfall('moto', 1);

      expect(res).toBe(7);
    });

    it('runs the "moto" hooks in waterfall asynchronously', async () => {
      const app = StrapiApp({ middlewares, reducers, library });

      app.createHook('hello');
      app.createHook('moto');

      app.registerHook('hello', () => 5);
      app.registerHook('moto', (n) => n + 1);
      app.registerHook('moto', (n) => Promise.resolve(n + 2));
      app.registerHook('moto', (n) => n + 3);

      const res = await app.runHookWaterfall('moto', 1, true);

      expect(res).toBe(7);
    });

    it('runs the "moto" hooks in parallel', async () => {
      const app = StrapiApp({ middlewares, reducers, library });

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
      const app = StrapiApp({ middlewares, reducers, library });

      expect(app.settings).toBeDefined();
      expect(app.settings.global).toBeDefined();
    });

    it('should creates a new section', () => {
      const app = StrapiApp({ middlewares, reducers, library });
      const section = { id: 'foo', intlLabel: { id: 'foo', defaultMessage: 'foo' } };
      const links = [
        {
          Component: jest.fn(),
          to: '/bar',
          id: 'bar',
          intlLabel: { id: 'bar', defaultMessage: 'bar' },
        },
      ];
      app.createSettingSection(section, links);

      expect(app.settings.foo).toBeDefined();
      expect(app.settings.foo.links).toEqual(links);
    });

    it('should add a link correctly to the global section', () => {
      const app = StrapiApp({ middlewares, reducers, library });
      const link = {
        Component: jest.fn(),
        to: '/bar',
        id: 'bar',
        intlLabel: { id: 'bar', defaultMessage: 'bar' },
      };

      app.addSettingsLink('global', link);

      expect(app.settings.global.links).toHaveLength(1);
      expect(app.settings.global.links[0]).toEqual(link);
    });

    it('should add an array of links correctly to the global section', () => {
      const app = StrapiApp({ middlewares, reducers, library });
      const links = [
        {
          Component: jest.fn(),
          to: '/bar',
          id: 'bar',
          intlLabel: { id: 'bar', defaultMessage: 'bar' },
        },
      ];

      app.addSettingsLinks('global', links);

      expect(app.settings.global.links).toHaveLength(1);
      expect(app.settings.global.links).toEqual(links);
    });
  });

  describe('Custom fields api', () => {
    it('should register a custom field', () => {
      const app = StrapiApp({ middlewares, reducers, library });
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
      };

      app.customFields.register(field);
      expect(app.customFields.get('plugin::myplugin.pluginCustomField')).toEqual(field);
      expect(app.customFields.getAll()).toEqual({
        'plugin::myplugin.pluginCustomField': field,
      });
    });

    it('should register a custom field with valid options', () => {
      const app = StrapiApp({ middlewares, reducers, library });
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

      app.customFields.register(field);
      expect(app.customFields.get('plugin::myplugin.optionsCustomField')).toEqual(field);
    });

    it('should register several custom fields at once', () => {
      const app = StrapiApp({ middlewares, reducers, library });
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

      app.customFields.register(fields);
      expect(app.customFields.get('plugin::myplugin.field1')).toEqual(fields[0]);
      expect(app.customFields.get('plugin::myplugin.field2')).toEqual(fields[1]);
    });

    it('should register a custom field without pluginId', () => {
      const app = StrapiApp({ middlewares, reducers, library });
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

      app.customFields.register(field);
      const uid = 'global::appCustomField';
      expect(app.customFields.get(uid)).toEqual(field);
    });

    it('should prevent registering same custom field twice', () => {
      const app = StrapiApp({ middlewares, reducers, library });
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
      app.customFields.register(field);
      expect(() => app.customFields.register(field)).toThrowError(
        "Custom field: 'plugin::myplugin.redundantCustomField' has already been registered"
      );
    });

    it('should validate the name can be used as an object key', () => {
      const app = StrapiApp({ middlewares, reducers, library });
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

      expect(() => app.customFields.register(field)).toThrowError(
        "Custom field name: 'test.boom' is not a valid object key"
      );
    });

    it('should prevent registering incomplete custom field', () => {
      const app = StrapiApp({ middlewares, reducers, library });
      const field = {
        name: 'incompleteCustomField',
        pluginId: 'myplugin',
      };

      expect(() => app.customFields.register(field)).toThrowError(/(a|an) .* must be provided/i);
    });

    it('should validate option path names', () => {
      const app = StrapiApp({ middlewares, reducers, library });
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
      expect(() => app.customFields.register(field)).toThrowError(
        "'plop' must be prefixed with 'options.'"
      );
      // Test deep value
      field.options.advanced = [{ sectionTitle: null, items: [{ name: 'deep.plop' }] }];
      expect(() => app.customFields.register(field)).toThrowError(
        "'deep.plop' must be prefixed with 'options.'"
      );
    });

    it('requires options to have a name property', () => {
      const app = StrapiApp({ middlewares, reducers, library });
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

      expect(() => app.customFields.register(field)).toThrowError(
        "The 'name' property is required on an options object"
      );
    });
  });

  describe('Menu api', () => {
    it('the menu should be defined', () => {
      const app = StrapiApp({ middlewares, reducers, library });

      expect(app.menu).toBeDefined();
      expect(Array.isArray(app.menu)).toBe(true);
    });

    it('addMenuLink should add a link to the menu', () => {
      const app = StrapiApp({ middlewares, reducers, library });
      const link = {
        Component: jest.fn(),
        to: '/plugins/bar',
        intlLabel: { id: 'bar', defaultMessage: 'bar' },
        permissions: [],
        icon: () => 'book',
      };

      app.addMenuLink(link);

      expect(app.menu[0]).toBeDefined();
      expect(app.menu[0]).toEqual(link);
    });

    it('addCorePluginMenuLink should add a link to the menu', () => {
      const app = StrapiApp({ middlewares, reducers, library });
      const link = {
        to: '/plugins/content-type-builder',
        icon: () => 'book',
        permissions: [],
        intlLabel: {
          id: 'content-type-builder.plugin.name',
          defaultMessage: 'Content Type builder',
        },
      };

      app.addCorePluginMenuLink(link);

      expect(app.menu).toHaveLength(1);
      expect(app.menu[0]).toEqual(link);
    });
  });

  describe('createCustomConfigurations', () => {
    it('should add a locale', () => {
      const adminConfig = {
        config: { locales: ['fr'] },
      };
      const app = StrapiApp({ middlewares, reducers, library, adminConfig });

      app.createCustomConfigurations();

      expect(app.configurations.locales).toEqual(['en', 'fr']);
    });

    it('should override the authLogo', () => {
      const adminConfig = {
        config: { auth: { logo: 'fr' } },
      };
      const app = StrapiApp({ middlewares, reducers, library, adminConfig });

      app.createCustomConfigurations();

      expect(app.configurations.authLogo).toBe('fr');
    });

    it('should override the menuLogo', () => {
      const adminConfig = {
        config: { menu: { logo: 'fr' } },
      };
      const app = StrapiApp({ middlewares, reducers, library, adminConfig });

      app.createCustomConfigurations();

      expect(app.configurations.menuLogo).toBe('fr');
    });

    it('should override the favicon', () => {
      const adminConfig = {
        config: { head: { favicon: 'fr' } },
      };
      const app = StrapiApp({ middlewares, reducers, library, adminConfig });

      app.createCustomConfigurations();

      expect(app.configurations.head.favicon).toBe('fr');
    });

    it('should override the light theme', () => {
      const adminConfig = {
        config: { theme: { light: { colors: { red: 'black' } } } },
      };
      const app = StrapiApp({ middlewares, reducers, library, adminConfig });

      app.createCustomConfigurations();

      expect(app.configurations.themes.light.colors.red).toBe('black');
    });

    it('should override the dark theme', () => {
      const adminConfig = {
        config: { theme: { dark: { colors: { red: 'black' } } } },
      };
      const app = StrapiApp({ middlewares, reducers, library, adminConfig });

      app.createCustomConfigurations();

      expect(app.configurations.themes.dark.colors.red).toBe('black');
    });

    it('should override the light theme with a legacy syntax (without light or dark keys) and log a warning', () => {
      const origalConsoleWarning = console.warn;

      console.warn = jest.fn();

      const adminConfig = {
        config: { theme: { colors: { red: 'black' } } },
      };
      const app = StrapiApp({ middlewares, reducers, library, adminConfig });

      app.createCustomConfigurations();

      expect(app.configurations.themes.light.colors.red).toBe('black');
      expect(console.warn).toBeCalledTimes(1);

      console.warn = origalConsoleWarning;
    });

    it('should override the tutorials', () => {
      const adminConfig = {
        config: { tutorials: false },
      };
      const app = StrapiApp({ middlewares, reducers, library, adminConfig });

      app.createCustomConfigurations();

      expect(app.configurations.tutorials).toBeFalsy();
    });

    it('should override the release notification', () => {
      const adminConfig = {
        config: { notifications: { releases: false } },
      };
      const app = StrapiApp({ middlewares, reducers, library, adminConfig });

      app.createCustomConfigurations();

      expect(app.configurations.notifications.releases).toBeFalsy();
    });
  });
});
