'use strict';

const { findTables } = require('../persisted-tables');

const strapiMock = {
  db: {
    dialect: {
      schemaInspector: {
        getTables: jest.fn(() => []),
      },
    },
  },
};
describe('Persist table functions', () => {
  describe('findTables', () => {
    test('should return an empty array if no tables are found', async () => {
      strapiMock.db.dialect.schemaInspector.getTables.mockReturnValueOnce([
        'addresses',
        'not_a_strapi_table',
      ]);
      const result = await findTables({ strapi: strapiMock }, /^strapi_.*/);

      expect(result).toEqual([]);
    });
    test('should return a filtered array of table names', async () => {
      strapiMock.db.dialect.schemaInspector.getTables.mockReturnValueOnce([
        'addresses',
        'strapi_users',
        'strapi_roles',
        'strapi_plugins',
        'not_a_strapi_table',
      ]);
      const result = await findTables({ strapi: strapiMock }, /^strapi_.*/);

      expect(result).toEqual(['strapi_users', 'strapi_roles', 'strapi_plugins']);
    });
  });
});
