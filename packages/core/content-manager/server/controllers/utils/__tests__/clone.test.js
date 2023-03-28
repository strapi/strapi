'use strict';

const { hasProhibitedCloningFields } = require('../clone');

describe('Populate', () => {
  const fakeModels = {
    simple: {
      modelName: 'Fake simple model',
      attributes: {
        text: {
          type: 'string',
        },
      },
    },
    simpleUnique: {
      modelName: 'Fake simple model',
      attributes: {
        text: {
          type: 'string',
          unique: true,
        },
      },
    },
    component: {
      modelName: 'Fake component model',
      attributes: {
        componentAttrName: {
          type: 'component',
          component: 'simple',
        },
      },
    },
    componentUnique: {
      modelName: 'Fake component model',
      attributes: {
        componentAttrName: {
          type: 'component',
          component: 'simpleUnique',
        },
      },
    },
    dynZone: {
      modelName: 'Fake dynamic zone model',
      attributes: {
        dynZoneAttrName: {
          type: 'dynamiczone',
          components: ['simple', 'component'],
        },
      },
    },
    dynZoneUnique: {
      modelName: 'Fake dynamic zone model',
      attributes: {
        dynZoneAttrName: {
          type: 'dynamiczone',
          components: ['simple', 'componentUnique'],
        },
      },
    },
    relation: {
      modelName: 'Fake relation oneToMany model',
      attributes: {
        relationAttrName: {
          type: 'relation',
          relation: 'oneToMany',
        },
      },
    },
    media: {
      modelName: 'Fake media model',
      attributes: {
        mediaAttrName: {
          type: 'media',
        },
      },
    },
  };

  describe('hasProhibitedCloningFields', () => {
    beforeEach(() => {
      global.strapi = {
        getModel: jest.fn((uid) => fakeModels[uid]),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('model without unique fields', () => {
      const hasProhibitedFields = hasProhibitedCloningFields('simple');
      expect(hasProhibitedFields).toEqual(false);
    });

    test('model with unique fields', () => {
      const hasProhibitedFields = hasProhibitedCloningFields('simpleUnique');
      expect(hasProhibitedFields).toEqual(true);
    });

    test('model with component', () => {
      const hasProhibitedFields = hasProhibitedCloningFields('component');
      expect(hasProhibitedFields).toEqual(false);
    });

    test('model with component & unique fields', () => {
      const hasProhibitedFields = hasProhibitedCloningFields('componentUnique');
      expect(hasProhibitedFields).toEqual(true);
    });

    test('model with component & unique fields', () => {
      const hasProhibitedFields = hasProhibitedCloningFields('componentUnique');
      expect(hasProhibitedFields).toEqual(true);
    });

    test('model with dynamic zone', () => {
      const hasProhibitedFields = hasProhibitedCloningFields('dynZone');
      expect(hasProhibitedFields).toEqual(false);
    });

    test('model with dynamic zone', () => {
      const hasProhibitedFields = hasProhibitedCloningFields('dynZoneUnique');
      expect(hasProhibitedFields).toEqual(true);
    });

    test('model with relation', () => {
      const hasProhibitedFields = hasProhibitedCloningFields('relation');
      expect(hasProhibitedFields).toEqual(true);
    });

    test('model with media', () => {
      const hasProhibitedFields = hasProhibitedCloningFields('media');
      expect(hasProhibitedFields).toEqual(false);
    });
  });
});
