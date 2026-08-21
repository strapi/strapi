import { merge } from 'lodash/fp';
import { toPermission } from '../../domain/permission';
import {
  getNestedFields,
  getPermissionsWithNestedFields,
  cleanPermissionFields,
  getNestedFieldsWithIntermediate,
} from '../content-type';

describe('Content-Type', () => {
  const contentTypes = {
    user: {
      uid: 'user',
      attributes: {
        firstname: { type: 'text', required: true },
        restaurant: { type: 'component', component: 'restaurant' },
        car: { type: 'component', component: 'car', required: true },
      },
    },
    country: {
      uid: 'country',
      attributes: {
        name: { type: 'text' },
        code: { type: 'text' },
      },
    },
  };
  const components = {
    restaurant: {
      uid: 'restaurant',
      attributes: {
        name: { type: 'text' },
        description: { type: 'text' },
        address: { type: 'component', component: 'address' },
      },
    },
    car: {
      uid: 'car',
      attributes: {
        model: { type: 'text' },
      },
    },
    address: {
      uid: 'address',
      attributes: {
        city: { type: 'text' },
        country: { type: 'text', required: true },
        gpsCoordinates: { type: 'component', component: 'gpsCoordinates' },
      },
    },
    gpsCoordinates: {
      uid: 'gpsCoordinates',
      attributes: {
        lat: { type: 'text' },
        long: { type: 'text' },
      },
    },
  };

  global.strapi = {
    components,
    contentTypes,
    admin: { services: { condition: { isValidCondition: () => true } } },
  } as any;

  describe('getNestedFields', () => {
    const testsA = [
      [1, ['firstname', 'restaurant', 'car']],
      [
        2,
        [
          'firstname',
          'restaurant.name',
          'restaurant.description',
          'restaurant.address',
          'car.model',
        ],
      ],
      [
        3,
        [
          'firstname',
          'restaurant.name',
          'restaurant.description',
          'restaurant.address.city',
          'restaurant.address.country',
          'restaurant.address.gpsCoordinates',
          'car.model',
        ],
      ],
      [
        4,
        [
          'firstname',
          'restaurant.name',
          'restaurant.description',
          'restaurant.address.city',
          'restaurant.address.country',
          'restaurant.address.gpsCoordinates.lat',
          'restaurant.address.gpsCoordinates.long',
          'car.model',
        ],
      ],
      [
        5,
        [
          'firstname',
          'restaurant.name',
          'restaurant.description',
          'restaurant.address.city',
          'restaurant.address.country',
          'restaurant.address.gpsCoordinates.lat',
          'restaurant.address.gpsCoordinates.long',
          'car.model',
        ],
      ],
    ];

    test.each(testsA)('%p level(s)', async (nestingLevel: any, expectedResult: any) => {
      const res = getNestedFields(contentTypes.user as any, {
        nestingLevel,
        components: strapi.components,
      });
      expect(res).toEqual(expectedResult);
    });

    const testsB = [
      [undefined, ['firstname', 'car']],
      [null, ['firstname', 'car']],
      [
        ['firstname', 'car'],
        ['firstname', 'car'],
      ],
      [['restaurant.description'], ['firstname', 'car']],
      [['restaurant.address'], ['firstname', 'restaurant.address.country', 'car']],
      [['restaurant.address.city'], ['firstname', 'restaurant.address.country', 'car']],
      [
        ['firstname', 'restaurant.address.country', 'car'],
        ['firstname', 'restaurant.address.country', 'car'],
      ],
    ];

    // @ts-expect-error test matrix includes dynamic field tuples
    test.each(testsB)('requiredOnly : %p -> %p', (existingFields: any, expectedResult: any) => {
      const res = getNestedFields(contentTypes.user as any, {
        components: strapi.components,
        requiredOnly: true,
        existingFields,
      });
      expect(res).toEqual(expectedResult);
    });
  });

  describe('getNestedFieldsWithIntermediate', () => {
    const tests = [
      [1, ['firstname', 'restaurant', 'car']],
      [
        2,
        [
          'firstname',
          'restaurant',
          'restaurant.name',
          'restaurant.description',
          'restaurant.address',
          'car',
          'car.model',
        ],
      ],
      [
        3,
        [
          'firstname',
          'restaurant',
          'restaurant.name',
          'restaurant.description',
          'restaurant.address',
          'restaurant.address.city',
          'restaurant.address.country',
          'restaurant.address.gpsCoordinates',
          'car',
          'car.model',
        ],
      ],
      [
        4,
        [
          'firstname',
          'restaurant',
          'restaurant.name',
          'restaurant.description',
          'restaurant.address',
          'restaurant.address.city',
          'restaurant.address.country',
          'restaurant.address.gpsCoordinates',
          'restaurant.address.gpsCoordinates.lat',
          'restaurant.address.gpsCoordinates.long',
          'car',
          'car.model',
        ],
      ],
      [
        5,
        [
          'firstname',
          'restaurant',
          'restaurant.name',
          'restaurant.description',
          'restaurant.address',
          'restaurant.address.city',
          'restaurant.address.country',
          'restaurant.address.gpsCoordinates',
          'restaurant.address.gpsCoordinates.lat',
          'restaurant.address.gpsCoordinates.long',
          'car',
          'car.model',
        ],
      ],
    ];

    test.each(tests)(
      '%p level(s) - withIntermediate',
      async (nestingLevel: any, expectedResult: any) => {
        const res = getNestedFieldsWithIntermediate(
          contentTypes.user as any,
          {
            nestingLevel,
            components: strapi.components,
            withIntermediate: true,
          } as any
        );
        expect(res).toEqual(expectedResult);
      }
    );
  });

  describe('getPermissionsWithNestedFields', () => {
    test('1 action (no nesting)', async () => {
      const resultLevel1 = getPermissionsWithNestedFields([
        { actionId: 'action-1', subjects: ['country'], options: { applyToProperties: ['fields'] } },
      ]);

      expect(resultLevel1).toEqual([
        {
          action: 'action-1',
          actionParameters: {},
          subject: 'country',
          properties: { fields: ['name', 'code'] },
          conditions: [],
        },
      ]);
    });

    test('2 actions (with nesting level 1)', async () => {
      const resultLevel1 = getPermissionsWithNestedFields(
        [
          {
            actionId: 'action-1',
            subjects: ['country', 'user'],
            options: { applyToProperties: ['fields'] },
          },
        ],
        { nestingLevel: 1 }
      );
      expect(resultLevel1).toEqual([
        {
          action: 'action-1',
          actionParameters: {},
          subject: 'country',
          properties: { fields: ['name', 'code'] },
          conditions: [],
        },
        {
          action: 'action-1',
          actionParameters: {},
          subject: 'user',
          properties: { fields: ['firstname', 'restaurant', 'car'] },
          conditions: [],
        },
      ]);
    });

    test('2 actions (with nesting level 2)', async () => {
      const resultLevel1 = getPermissionsWithNestedFields(
        [
          {
            actionId: 'action-1',
            subjects: ['country', 'user'],
            options: { applyToProperties: ['fields'] },
          },
        ],
        { nestingLevel: 2 }
      );
      expect(resultLevel1).toEqual([
        {
          action: 'action-1',
          actionParameters: {},
          subject: 'country',
          properties: { fields: ['name', 'code'] },
          conditions: [],
        },
        {
          action: 'action-1',
          actionParameters: {},
          subject: 'user',
          properties: {
            fields: [
              'firstname',
              'restaurant.name',
              'restaurant.description',
              'restaurant.address',
              'car.model',
            ],
          },
          conditions: [],
        },
      ]);
    });

    test('2 actions (with nesting level 100)', async () => {
      const resultLevel1 = getPermissionsWithNestedFields([
        {
          actionId: 'action-1',
          subjects: ['country', 'user'],
          options: { applyToProperties: ['fields'] },
        },
      ]);
      expect(resultLevel1).toEqual([
        {
          action: 'action-1',
          actionParameters: {},
          subject: 'country',
          properties: { fields: ['name', 'code'] },
          conditions: [],
        },
        {
          action: 'action-1',
          actionParameters: {},
          subject: 'user',
          properties: {
            fields: [
              'firstname',
              'restaurant.name',
              'restaurant.description',
              'restaurant.address.city',
              'restaurant.address.country',
              'restaurant.address.gpsCoordinates.lat',
              'restaurant.address.gpsCoordinates.long',
              'car.model',
            ],
          },
          conditions: [],
        },
      ]);
    });
  });

  describe('cleanPermissionFields', () => {
    beforeAll(() => {
      global.strapi = merge(global.strapi, {
        admin: {
          services: {
            permission: {
              actionProvider: {
                get: () => ({ options: { applyToProperties: ['fields'] } }),
              },
            },
          },
        },
      });
    });

    const tests = [
      [undefined, []],
      [null, []],
      [
        ['firstname', 'car'],
        ['firstname', 'car.model'],
      ],
      [['restaurant.description'], ['restaurant.description']],
      [
        ['restaurant.address'],
        [
          'restaurant.address.city',
          'restaurant.address.country',
          'restaurant.address.gpsCoordinates.lat',
          'restaurant.address.gpsCoordinates.long',
        ],
      ],
      [['restaurant.address.city'], ['restaurant.address.city']],
      [
        ['firstname', 'restaurant.address.country', 'car'],
        ['firstname', 'restaurant.address.country', 'car.model'],
      ],
      [
        ['restaurant'],
        [
          'restaurant.name',
          'restaurant.description',
          'restaurant.address.city',
          'restaurant.address.country',
          'restaurant.address.gpsCoordinates.lat',
          'restaurant.address.gpsCoordinates.long',
        ],
      ],
      [
        ['restaurant.name', 'restaurant.address', 'restaurant.address.country'],
        [
          'restaurant.name',
          'restaurant.address.city',
          'restaurant.address.country',
          'restaurant.address.gpsCoordinates.lat',
          'restaurant.address.gpsCoordinates.long',
        ],
      ],
      [['nonexistent.field', 'firstname'], ['firstname']],
      [['restaurant.address.gpsCoordinates.lat'], ['restaurant.address.gpsCoordinates.lat']],
    ];

    // @ts-expect-error test matrix includes invalid field fixtures
    test.each(tests)('given fields %p, it returns %p', (fields, expectedFields) => {
      // @ts-expect-error testing invalid fields type
      const permissions = toPermission([
        {
          action: 'foo',
          subject: 'user',
          properties: { fields },
        },
      ]);

      const res = cleanPermissionFields(permissions);
      expect(res).toEqual([
        {
          action: 'foo',
          actionParameters: {},
          subject: 'user',
          properties: { fields: expectedFields },
          conditions: [],
        },
      ]);
    });
  });

  describe('cache behavior', () => {
    test('should cache nested fields by subject to avoid redundant traversals', () => {
      // Create three permissions on the same subject with different field sets
      const permissions = toPermission([
        {
          action: 'foo',
          subject: 'user',
          properties: { fields: ['firstname', 'restaurant.address'] },
        },
        {
          action: 'foo',
          subject: 'user',
          properties: { fields: ['car'] },
        },
        {
          action: 'foo',
          subject: 'user',
          properties: { fields: ['firstname', 'restaurant.description'] },
        },
      ]);

      // Clean all three permissions
      const res = cleanPermissionFields(permissions);

      // All three should be cleaned correctly
      expect(res).toHaveLength(3);

      // First permission
      expect(res[0]).toEqual({
        action: 'foo',
        actionParameters: {},
        subject: 'user',
        properties: {
          fields: [
            'firstname',
            'restaurant.address.city',
            'restaurant.address.country',
            'restaurant.address.gpsCoordinates.lat',
            'restaurant.address.gpsCoordinates.long',
          ],
        },
        conditions: [],
      });

      // Second permission
      expect(res[1]).toEqual({
        action: 'foo',
        actionParameters: {},
        subject: 'user',
        properties: { fields: ['car.model'] },
        conditions: [],
      });

      // Third permission
      expect(res[2]).toEqual({
        action: 'foo',
        actionParameters: {},
        subject: 'user',
        properties: {
          fields: ['firstname', 'restaurant.description'],
        },
        conditions: [],
      });
    });

    test('should use separate cache entries for different subjects', () => {
      // Create permissions for two different subjects
      const permissions = toPermission([
        {
          action: 'foo',
          subject: 'user',
          properties: { fields: ['firstname'] },
        },
        {
          action: 'foo',
          subject: 'country',
          properties: { fields: ['name'] },
        },
        {
          action: 'foo',
          subject: 'user',
          properties: { fields: ['car'] },
        },
      ]);

      const res = cleanPermissionFields(permissions);

      // Should have three results
      expect(res).toHaveLength(3);

      // User subject permissions should be cleaned as user fields
      expect(res[0].subject).toEqual('user');
      expect(res[0].properties.fields).toContain('firstname');

      expect(res[2].subject).toEqual('user');
      expect(res[2].properties.fields).toEqual(['car.model']);

      // Country subject permission should be cleaned as country fields
      expect(res[1].subject).toEqual('country');
      expect(res[1].properties.fields).toContain('name');
    });

    test('should handle mixed permissions with multiple subjects and fields', () => {
      // Simulate a realistic scenario with many permissions on same subject
      // This would be expensive without caching
      const permissions = toPermission([
        {
          action: 'read',
          subject: 'user',
          properties: { fields: ['firstname', 'restaurant'] },
        },
        {
          action: 'create',
          subject: 'user',
          properties: { fields: ['firstname'] },
        },
        {
          action: 'update',
          subject: 'user',
          properties: { fields: ['restaurant.address.country', 'car'] },
        },
        {
          action: 'delete',
          subject: 'user',
          properties: { fields: ['firstname', 'car.model'] },
        },
      ]);

      const res = cleanPermissionFields(permissions);

      // All permissions should be cleaned
      expect(res).toHaveLength(4);

      // Verify each is a valid permission object
      res.forEach((perm) => {
        expect(perm).toHaveProperty('action');
        expect(perm).toHaveProperty('subject');
        expect(perm).toHaveProperty('properties.fields');
        expect(perm).toHaveProperty('conditions');
      });

      // All should be user subject
      res.forEach((perm) => {
        expect(perm.subject).toEqual('user');
      });
    });
  });
});
