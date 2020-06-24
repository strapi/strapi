'use strict';

const contentTypeService = require('../content-type');

describe('Content-Type', () => {
  describe('getNestedFields', () => {
    const contentTypes = {
      user: {
        uid: 'user',
        attributes: {
          firstname: { type: 'text' },
          restaurant: { type: 'component', component: 'restaurant' },
          car: { type: 'component', component: 'car' },
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
          country: { type: 'text' },
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

    test('1 level', async () => {
      const resultLevel1 = contentTypeService.getNestedFields(contentTypes.user, {
        nestingLevel: 1,
        components,
      });
      expect(resultLevel1).toEqual(['firstname', 'restaurant', 'car']);
    });

    test('2 levels', async () => {
      const resultLevel1 = contentTypeService.getNestedFields(contentTypes.user, {
        nestingLevel: 2,
        components,
      });
      expect(resultLevel1).toEqual([
        'firstname',
        'restaurant.name',
        'restaurant.description',
        'restaurant.address',
        'car.model',
      ]);
    });

    test('3 levels', async () => {
      const resultLevel1 = contentTypeService.getNestedFields(contentTypes.user, {
        nestingLevel: 3,
        components,
      });
      expect(resultLevel1).toEqual([
        'firstname',
        'restaurant.name',
        'restaurant.description',
        'restaurant.address.city',
        'restaurant.address.country',
        'restaurant.address.gpsCoordinates',
        'car.model',
      ]);
    });

    test('4 levels', async () => {
      const resultLevel1 = contentTypeService.getNestedFields(contentTypes.user, {
        nestingLevel: 4,
        components,
      });
      expect(resultLevel1).toEqual([
        'firstname',
        'restaurant.name',
        'restaurant.description',
        'restaurant.address.city',
        'restaurant.address.country',
        'restaurant.address.gpsCoordinates.lat',
        'restaurant.address.gpsCoordinates.long',
        'car.model',
      ]);
    });

    test('5 levels (deeper than needed)', async () => {
      const resultLevel1 = contentTypeService.getNestedFields(contentTypes.user, {
        nestingLevel: 5,
        components,
      });
      expect(resultLevel1).toEqual([
        'firstname',
        'restaurant.name',
        'restaurant.description',
        'restaurant.address.city',
        'restaurant.address.country',
        'restaurant.address.gpsCoordinates.lat',
        'restaurant.address.gpsCoordinates.long',
        'car.model',
      ]);
    });
  });

  describe('getPermissionsWithNestedFields', () => {
    const components = {
      car: {
        uid: 'car',
        attributes: {
          model: { type: 'text' },
        },
      },
      restaurant: {
        uid: 'restaurant',
        attributes: {
          name: { type: 'text' },
          description: { type: 'text' },
          address: { type: 'component', component: 'address' },
        },
      },
      address: {
        uid: 'address',
        attributes: {
          city: { type: 'text' },
          country: { type: 'text' },
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

    const contentTypes = {
      user: {
        uid: 'user',
        attributes: {
          firstname: { type: 'text' },
          restaurant: { type: 'component', component: 'restaurant' },
          car: { type: 'component', component: 'car' },
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

    global.strapi = { components, contentTypes };

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
        1
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
        2
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
      const resultLevel1 = contentTypeService.getPermissionsWithNestedFields(
        [{ actionId: 'action-1', subjects: ['country', 'user'] }],
        100
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
});
