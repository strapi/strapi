'use strict';

const contentTypeService = require('../content-type');

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

  global.strapi = { components, contentTypes };

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

    test.each(testsA)('%p level(s)', async (nestingLevel, expectedResult) => {
      const res = contentTypeService.getNestedFields(contentTypes.user, {
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

    test.each(testsB)('requiredOnly : %p -> %p', (existingFields, expectedResult) => {
      const res = contentTypeService.getNestedFields(contentTypes.user, {
        components: strapi.components,
        requiredOnly: true,
        existingFields,
      });
      expect(res).toEqual(expectedResult);
    });

    const testsC = [
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

    test.each(testsC)('%p level(s) - withIntermediate', async (nestingLevel, expectedResult) => {
      const res = contentTypeService.getNestedFields(contentTypes.user, {
        nestingLevel,
        components: strapi.components,
        withIntermediate: true,
      });
      expect(res).toEqual(expectedResult);
    });
  });

  describe('getPermissionsWithNestedFields', () => {
    test('1 action (no nesting)', async () => {
      const resultLevel1 = contentTypeService.getPermissionsWithNestedFields([
        { actionId: 'action-1', subjects: ['country'] },
      ]);
      expect(resultLevel1).toEqual([
        {
          action: 'action-1',
          subject: 'country',
          fields: ['name', 'code'],
          conditions: [],
        },
      ]);
    });

    test('2 actions (with nesting level 1)', async () => {
      const resultLevel1 = contentTypeService.getPermissionsWithNestedFields(
        [{ actionId: 'action-1', subjects: ['country', 'user'] }],
        { nestingLevel: 1 }
      );
      expect(resultLevel1).toEqual([
        {
          action: 'action-1',
          subject: 'country',
          fields: ['name', 'code'],
          conditions: [],
        },
        {
          action: 'action-1',
          subject: 'user',
          fields: ['firstname', 'restaurant', 'car'],
          conditions: [],
        },
      ]);
    });

    test('2 actions (with nesting level 2)', async () => {
      const resultLevel1 = contentTypeService.getPermissionsWithNestedFields(
        [{ actionId: 'action-1', subjects: ['country', 'user'] }],
        { nestingLevel: 2 }
      );
      expect(resultLevel1).toEqual([
        {
          action: 'action-1',
          subject: 'country',
          fields: ['name', 'code'],
          conditions: [],
        },
        {
          action: 'action-1',
          subject: 'user',
          fields: [
            'firstname',
            'restaurant.name',
            'restaurant.description',
            'restaurant.address',
            'car.model',
          ],
          conditions: [],
        },
      ]);
    });

    test('2 actions (with nesting level 100)', async () => {
      const resultLevel1 = contentTypeService.getPermissionsWithNestedFields([
        { actionId: 'action-1', subjects: ['country', 'user'] },
      ]);
      expect(resultLevel1).toEqual([
        {
          action: 'action-1',
          subject: 'country',
          fields: ['name', 'code'],
          conditions: [],
        },
        {
          action: 'action-1',
          subject: 'user',
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
          conditions: [],
        },
      ]);
    });
  });

  describe('cleanPermissionFields', () => {
    const tests = [
      [undefined, ['firstname', 'car']],
      [null, ['firstname', 'car']],
      [
        ['firstname', 'car'],
        ['firstname', 'car'],
      ],
      [['restaurant.description'], ['restaurant.description', 'firstname', 'car']],
      [['restaurant.address'], ['firstname', 'restaurant.address.country', 'car']],
      [
        ['restaurant.address.city'],
        ['restaurant.address.city', 'firstname', 'restaurant.address.country', 'car'],
      ],
      [
        ['firstname', 'restaurant.address.country', 'car'],
        ['firstname', 'restaurant.address.country', 'car'],
      ],
    ];

    test.each(tests)('requiredOnly : %p -> %p', (fields, expectedFields) => {
      const res = contentTypeService.cleanPermissionFields(
        [
          {
            subject: 'user',
            fields,
          },
        ],
        {
          requiredOnly: true,
        }
      );
      expect(res).toEqual([
        {
          subject: 'user',
          fields: expectedFields,
        },
      ]);
    });
  });
});
