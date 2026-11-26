import { describe, it, expect, vi } from 'vitest';
import customFieldsRegistry from '../custom-fields';
import { convertCustomFieldType } from '../../utils/convert-custom-field-type';

const strapi = {
  plugins: { plugintest: 'foo' },
  plugin: vi.fn((plugin) => strapi.plugins[plugin]),
};

describe('Custom fields registry', () => {
  describe('add', () => {
    it('adds a custom field registered in a plugin', () => {
      const mockCF = {
        name: 'test',
        plugin: 'plugintest',
        type: 'text',
      };

      const customFields = customFieldsRegistry(strapi);
      customFields.add(mockCF);

      const expected = {
        'plugin::plugintest.test': mockCF,
      };
      expect(customFields.getAll()).toEqual(expected);
    });

    it('adds a custom field not registered in a plugin', () => {
      const mockCF = {
        name: 'test',
        type: 'text',
      };

      const customFields = customFieldsRegistry(strapi);
      customFields.add(mockCF);

      const expected = {
        'global::test': mockCF,
      };
      expect(customFields.getAll()).toEqual(expected);
    });

    it('requires a name key on the custom field', () => {
      const mockCF = {
        type: 'test',
      };

      const customFields = customFieldsRegistry(strapi);

      expect(() => customFields.add(mockCF)).toThrowError(
        `Custom fields require a 'name' and 'type' key`
      );
    });

    it('requires a type key on the custom field', () => {
      const mockCF = {
        name: 'test',
      };

      const customFields = customFieldsRegistry(strapi);

      expect(() => customFields.add(mockCF)).toThrowError(
        `Custom fields require a 'name' and 'type' key`
      );
    });

    it('validates the name can be used as an object key', () => {
      const mockCF = {
        name: 'test.boom',
        type: 'text',
      };

      const customFields = customFieldsRegistry(strapi);

      expect(() => customFields.add(mockCF)).toThrowError(
        `Custom field name: 'test.boom' is not a valid object key`
      );
    });

    it('validates the type is a Strapi type', () => {
      const mockCF = {
        name: 'test',
        type: 'geojson',
      };

      const customFields = customFieldsRegistry(strapi);

      expect(() => customFields.add(mockCF)).toThrowError(
        `Custom field type: 'geojson' is not a valid Strapi type`
      );
    });

    it('validates inputSize', () => {
      const mockCF = {
        name: 'test',
        type: 'text',
      };

      const customFields = customFieldsRegistry(strapi);

      expect(() => customFields.add({ ...mockCF, inputSize: 'small' })).toThrowError(
        `inputSize should be an object with 'default' and 'isResizable' keys`
      );
      expect(() => customFields.add({ ...mockCF, inputSize: ['array'] })).toThrowError(
        `inputSize should be an object with 'default' and 'isResizable' keys`
      );
      expect(() =>
        customFields.add({ ...mockCF, inputSize: { default: 99, isResizable: true } })
      ).toThrowError('Custom fields require a valid default input size');
      expect(() =>
        customFields.add({ ...mockCF, inputSize: { default: 12, isResizable: 'true' } })
      ).toThrowError('Custom fields should specify if their input is resizable');
    });

    it('confirms the custom field does not already exist', () => {
      const mockCF = {
        name: 'test',
        plugin: 'plugintest',
        type: 'text',
      };

      const customFields = customFieldsRegistry(strapi);

      customFields.add(mockCF);
      expect(() => customFields.add(mockCF)).toThrowError(
        `Custom field: 'plugin::plugintest.test' has already been registered`
      );
    });
  });
  describe('get', () => {
    it('gets a registered custom field', () => {
      const mockCF = {
        name: 'test',
        plugin: 'plugintest',
        type: 'text',
      };

      const customFields = customFieldsRegistry(strapi);
      customFields.add(mockCF);

      expect(customFields.get('plugin::plugintest.test')).toEqual(mockCF);
    });

    it('throws when a custom field is not registered', () => {
      const customFields = customFieldsRegistry(strapi);

      expect(() => customFields.get('plugin::plugintest.test')).toThrowError(
        `Could not find Custom Field: plugin::plugintest.test`
      );
    });
  });

  describe('late registration', () => {
    const createStrapi = (environment = 'development') => {
      const app = {
        plugins: { plugintest: 'foo' } as Record<string, unknown>,
        plugin: vi.fn((plugin: string) => app.plugins[plugin]),
        config: { get: (key: string) => (key === 'environment' ? environment : undefined) },
        log: { warn: vi.fn() },
        contentTypes: {},
        components: {},
        get: vi.fn(),
      };

      return app as any;
    };

    // What the end of the register phase does: it converts the custom field attributes
    const endRegisterPhase = (app: any, customFields: ReturnType<typeof customFieldsRegistry>) => {
      app.get.mockReturnValue(customFields);
      convertCustomFieldType(app);
    };

    const color = { name: 'color', plugin: 'plugintest', type: 'string' as const };
    const size = { name: 'size', type: 'integer' as const };

    it('adds a custom field before the end of the register phase, without a warning', () => {
      const app = createStrapi();
      const customFields = customFieldsRegistry(app);

      customFields.add(color);
      endRegisterPhase(app, customFields);

      expect(customFields.getAll()).toEqual({ 'plugin::plugintest.color': color });
      expect(app.log.warn).not.toHaveBeenCalled();
    });

    it('warns once per custom field added after the end of the register phase, and still adds it', () => {
      const app = createStrapi();
      const customFields = customFieldsRegistry(app);

      endRegisterPhase(app, customFields);
      customFields.add(color);

      expect(customFields.get('plugin::plugintest.color')).toEqual(color);
      expect(app.log.warn).toHaveBeenCalledTimes(1);
      expect(app.log.warn).toHaveBeenCalledWith(
        '[strapi] Custom field "plugin::plugintest.color" was registered after Strapi converted the custom field attributes at the end of the register phase: a content type or component that uses it stops the next start with "Could not find Custom Field: plugin::plugintest.color". Register it from a register function.'
      );

      // A second registration of the same custom field still throws, and logs nothing more
      expect(() => customFields.add(color)).toThrowError(
        `Custom field: 'plugin::plugintest.color' has already been registered`
      );
      expect(app.log.warn).toHaveBeenCalledTimes(1);

      customFields.add(size);

      expect(app.log.warn).toHaveBeenCalledTimes(2);
      expect(app.log.warn).toHaveBeenLastCalledWith(
        expect.stringContaining('[strapi] Custom field "global::size" was registered after')
      );
    });

    it('does not warn for a late custom field that fails validation', () => {
      const app = createStrapi();
      const customFields = customFieldsRegistry(app);

      endRegisterPhase(app, customFields);

      expect(() => customFields.add({ name: 'bad', type: 'media' as any })).toThrowError(
        `Custom field type: 'media' is not a valid Strapi type or it can't be used with a Custom Field`
      );
      expect(app.log.warn).not.toHaveBeenCalled();
    });

    it('does not warn outside the development environment', () => {
      const app = createStrapi('production');
      const customFields = customFieldsRegistry(app);

      endRegisterPhase(app, customFields);
      customFields.add(color);

      expect(customFields.get('plugin::plugintest.color')).toEqual(color);
      expect(app.log.warn).not.toHaveBeenCalled();
    });
  });
});
