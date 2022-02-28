'use strict';

const settingsService = require('../settings');

describe('Configuration settings service', () => {
  describe('createDefaultSettings', () => {
    test('Consistent defaults', async () => {
      const schema = {
        attributes: {},
      };

      const settings = await settingsService.createDefaultSettings(schema);

      expect(settings).toMatchInlineSnapshot(`
      Object {
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

      const spyFn = jest.spyOn(settingsService, 'createDefaultSettings');

      await settingsService.syncSettings(existingConfig, schema);
      expect(spyFn).toHaveBeenCalledWith(schema);

      spyFn.mockRestore();
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
