import { render } from '@testing-library/react';

import { StrapiApp } from '../StrapiApp';

describe('ADMIN | StrapiApp', () => {
  it('should render the app without plugins', () => {
    const app = new StrapiApp();
    const { container } = render(app.render());

    expect(container.firstChild).toMatchSnapshot();
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

    it('runs the "moto" hooks in waterfall asynchronously', async () => {
      const app = new StrapiApp();

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
    it('should create a new section', () => {
      const app = new StrapiApp();
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
      expect(app.settings.foo.links).toEqual(expect.any(Object));
    });

    it('should add a link correctly to the global section', () => {
      const app = new StrapiApp();
      const link = {
        Component: jest.fn(),
        to: '/bar',
        id: 'bar',
        intlLabel: { id: 'bar', defaultMessage: 'bar' },
      };

      app.addSettingsLink('global', link);

      expect(app.settings.global.links).toHaveLength(1);
      expect(app.settings.global.links[0]).toEqual(expect.any(Object));
    });

    it('should add an array of links correctly to the global section', () => {
      const app = new StrapiApp();
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
      expect(app.settings.global.links).toEqual(expect.any(Object));
    });
  });

  describe('Custom fields API', () => {
    // TODO: why is this using internals?
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
      };

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
      app.customFields.register(field);
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

      expect(() => app.customFields.register(field)).toThrowError(
        "The 'name' property is required on an options object"
      );
    });
  });

  describe('Menu api', () => {
    it('addMenuLink should add a link to the menu', () => {
      const app = new StrapiApp();
      const link = {
        Component: jest.fn(),
        to: '/plugins/bar',
        intlLabel: { id: 'bar', defaultMessage: 'bar' },
        permissions: [],
        icon: () => 'book',
      };

      app.addMenuLink(link);

      expect(app.menu[0]).toBeDefined();
      expect(app.menu[0]).toEqual(expect.any(Object));
    });
  });
});
