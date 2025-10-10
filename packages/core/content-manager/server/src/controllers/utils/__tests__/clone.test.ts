import { getProhibitedCloningFields } from '../clone';

describe('Populate', () => {
  const fakeModels = {
    simple: {
      modelName: 'Fake simple model',
      info: {
        displayName: 'Simple',
      },
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
      info: {
        displayName: 'Fake component',
      },
      attributes: {
        componentAttrName: {
          type: 'component',
          component: 'simple',
        },
      },
    },
    componentUnique: {
      modelName: 'Fake component model',
      info: {
        displayName: 'Unique Component',
      },
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
    relations: {
      modelName: 'Fake relation oneToMany model',
      attributes: {
        one_way: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'simple',
        },
        one_to_one: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'simple',
          private: true,
          inversedBy: 'one_to_one_kitchensink',
        },
        one_to_many: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'simple',
          mappedBy: 'many_to_one_kitchensink',
        },
        many_to_one: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'simple',
          inversedBy: 'one_to_many_kitchensinks',
        },
        many_to_manys: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'simple',
          inversedBy: 'many_to_many_kitchensinks',
        },
        many_way: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'simple',
        },
        morph_to_one: {
          type: 'relation',
          relation: 'morphToOne',
        },
        morph_to_many: {
          type: 'relation',
          relation: 'morphToMany',
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
  } as any;

  describe('hasProhibitedCloningFields', () => {
    beforeEach(() => {
      global.strapi = {
        getModel: jest.fn((uid) => fakeModels[uid]),
      } as any;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('model without unique fields', () => {
      const prohibitedFields = getProhibitedCloningFields('simple');
      expect(prohibitedFields).toHaveLength(0);
    });

    test('model with unique fields', () => {
      const prohibitedFields = getProhibitedCloningFields('simpleUnique');
      expect(prohibitedFields).toEqual([[['text'], 'unique']]);
    });

    test('model with component', () => {
      const prohibitedFields = getProhibitedCloningFields('component');
      expect(prohibitedFields).toHaveLength(0);
    });

    test('model with component & unique fields', () => {
      const prohibitedFields = getProhibitedCloningFields('componentUnique');
      expect(prohibitedFields).toEqual([[['componentAttrName', 'text'], 'unique']]);
    });

    test('model with dynamic zone', () => {
      const prohibitedFields = getProhibitedCloningFields('dynZone');
      expect(prohibitedFields).toHaveLength(0);
    });

    test('model with unique component in dynamic zone', () => {
      const prohibitedFields = getProhibitedCloningFields('dynZoneUnique');
      expect(prohibitedFields).toEqual([
        [['dynZoneAttrName', 'Unique Component', 'componentAttrName', 'text'], 'unique'],
      ]);
    });

    test('model with relations', () => {
      const prohibitedFields = getProhibitedCloningFields('relations');
      expect(prohibitedFields).toEqual([
        [['one_to_one'], 'relation'],
        [['one_to_many'], 'relation'],
      ]);
    });

    test('model with media', () => {
      const prohibitedFields = getProhibitedCloningFields('media');
      expect(prohibitedFields).toHaveLength(0);
    });
  });
});
