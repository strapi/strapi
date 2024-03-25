import * as settingsService from '../settings';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  traverse: {
    traverseQuerySort: jest.fn((a, b, c) => c),
  },
}));

jest.mock('../settings', () => {
  const originalSettingsService = jest.requireActual('../settings');

  const mockCreateDefaultSettings = jest.fn((...args) => {
    return originalSettingsService.createDefaultSettings(...args);
  });

  return {
    ...originalSettingsService,
    createDefaultSettings: mockCreateDefaultSettings,
  };
});

describe('Configuration settings service', () => {
  global.strapi = {
    getModel() {},
  } as any;

  describe('createDefaultSettings', () => {
    test('Consistent defaults', async () => {
      const schema = {
        attributes: {},
      };

      const settings = await settingsService.createDefaultSettings(schema);

      expect(settings).toMatchInlineSnapshot(`
        {
          "bulkable": true,
          "defaultSortBy": "id",
          "defaultSortOrder": "ASC",
          "filterable": true,
          "mainField": "id",
          "pageSize": 10,
          "searchable": true,
        }
      `);
    });

    test('uses id as mainField by default', async () => {
      const schema = {
        attributes: {},
      };

      const settings = await settingsService.createDefaultSettings(schema);

      expect(settings).toMatchObject({
        mainField: 'id',
        defaultSortBy: 'id',
      });
    });

    test('uses first string attribute that is not id', async () => {
      const schema = {
        attributes: {
          id: {
            type: 'string',
          },
          title: {
            type: 'string',
          },
        },
      };

      const settings = await settingsService.createDefaultSettings(schema);

      expect(settings).toMatchObject({
        mainField: 'title',
        defaultSortBy: 'title',
      });
    });

    test('uses overrides configured in schema config', async () => {
      const schema = {
        attributes: {
          id: {
            type: 'string',
          },
          title: {
            type: 'string',
          },
        },
        config: {
          settings: {
            searchable: false,
            filterable: false,
            bulkable: false,
          },
        },
      };

      const settings = await settingsService.createDefaultSettings(schema);

      expect(settings).toMatchObject({
        searchable: false,
        filterable: false,
        bulkable: false,
      });
    });

    test('Overrides cannot add new properties', async () => {
      const schema = {
        attributes: {
          id: {
            type: 'string',
          },
          title: {
            type: 'string',
          },
        },
        config: {
          settings: {
            searchable: false,
            filterable: false,
            bulkable: false,
            newProperty: 'test',
          },
        },
      };

      const settings = await settingsService.createDefaultSettings(schema);

      expect(settings).not.toHaveProperty('newProperty');
      expect(settings).toMatchObject({
        searchable: false,
        filterable: false,
        bulkable: false,
      });
    });
  });

  describe('syncSettings', () => {
    test('Creates default setting if empty', async () => {
      const schema = { attributes: {} };
      const existingConfig = {};

      await settingsService.syncSettings(existingConfig, schema);

      expect(settingsService.createDefaultSettings).toHaveBeenCalledWith(schema);
    });

    test('Reuses the existing config', async () => {
      const schema = { attributes: {} };
      const existingConfig = {
        settings: {
          searchable: false,
          bulkable: true,
        },
      };

      const settings = await settingsService.syncSettings(existingConfig, schema);

      expect(settings).toMatchObject({
        mainField: 'id',
        defaultSortBy: 'id',
        searchable: false,
        bulkable: true,
      });
    });

    test('Reset mainField if not sortable anymore', async () => {
      const schema = { attributes: {} };
      const existingConfig = {
        settings: {
          mainField: 'id',
          searchable: false,
          bulkable: true,
        },
      };

      const settings = await settingsService.syncSettings(existingConfig, schema);

      expect(settings).toMatchObject({
        mainField: 'id',
        defaultSortBy: 'id',
        searchable: false,
        bulkable: true,
      });
    });

    test('Reset defaultSortBy if not sortable anymore', async () => {
      const schema = { attributes: {} };
      const existingConfig = {
        settings: {
          mainField: 'id',
          searchable: false,
          bulkable: true,
        },
      };

      const settings = await settingsService.syncSettings(existingConfig, schema);

      expect(settings).toMatchObject({
        mainField: 'id',
        defaultSortBy: 'id',
        searchable: false,
        bulkable: true,
      });
    });
  });
});
