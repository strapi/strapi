import { getPopulateForValidation } from '../populate';

describe('getPopulateForValidation', () => {
  const fakeModels = {
    empty: {
      modelName: 'Fake empty model',
      attributes: {},
    },
    scalarOnly: {
      modelName: 'Fake scalar-only model',
      attributes: {
        title: { type: 'string', required: true },
        description: { type: 'text', required: false },
      },
    },
    componentWithRequiredFields: {
      modelName: 'Fake component with required fields',
      attributes: {
        componentAttrName: {
          type: 'component',
          component: 'componentFields',
        },
      },
    },
    componentFields: {
      modelName: 'Fake component fields',
      attributes: {
        subfield1: { type: 'string', required: true },
        subfield2: { type: 'number', required: false },
      },
    },
    componentWithoutRequiredFields: {
      modelName: 'Fake component without required fields',
      attributes: {
        componentAttrName: {
          type: 'component',
          component: 'empty',
        },
      },
    },
  } as any;

  beforeEach(() => {
    global.strapi = {
      getModel: jest.fn((uid) => fakeModels[uid]),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('with empty model', () => {
    const uid = 'empty';

    const result = getPopulateForValidation(uid as any);

    expect(result).toEqual({});
  });

  test('with scalar-only model', () => {
    const uid = 'scalarOnly';

    const result = getPopulateForValidation(uid as any);

    expect(result).toEqual({
      fields: ['title'], // Only scalar fields requiring validation
    });
  });

  describe('components', () => {
    test('with component model containing required fields', () => {
      const uid = 'componentWithRequiredFields';

      const result = getPopulateForValidation(uid as any);

      expect(result).toEqual({
        populate: {
          componentAttrName: {
            fields: ['subfield1'], // Only required fields in the component
          },
        },
      });
    });

    test('with component model without required fields', () => {
      const uid = 'componentWithoutRequiredFields';

      const result = getPopulateForValidation(uid as any);

      expect(result).toEqual({}); // No required fields, so no populate
    });

    test('with nested components', () => {
      fakeModels.nestedComponent = {
        modelName: 'Fake nested component model',
        attributes: {
          nestedComponentAttr: {
            type: 'component',
            component: 'componentFields',
          },
        },
      };

      fakeModels.parentModel = {
        modelName: 'Fake parent model',
        attributes: {
          parentComponent: {
            type: 'component',
            component: 'nestedComponent',
          },
        },
      };

      const uid = 'parentModel';

      const result = getPopulateForValidation(uid as any);

      expect(result).toEqual({
        populate: {
          parentComponent: {
            populate: {
              nestedComponentAttr: {
                fields: ['subfield1'],
              },
            },
          },
        },
      });
    });
  });

  describe('dynamic zones', () => {
    fakeModels.dynamicZone = {
      modelName: 'Fake dynamic zone model',
      attributes: {
        dynZoneAttrName: {
          type: 'dynamiczone',
          components: [
            'componentFields',
            'componentWithRequiredFields',
            'componentWithoutRequiredFields',
          ],
        },
      },
    };

    test('with dynamic zone model', () => {
      const uid = 'dynamicZone';

      const result = getPopulateForValidation(uid as any);

      expect(result).toEqual({
        populate: {
          dynZoneAttrName: {
            on: {
              componentFields: {
                fields: ['subfield1'],
              },
              componentWithRequiredFields: {
                populate: {
                  componentAttrName: {
                    fields: ['subfield1'],
                  },
                },
              },
            },
          },
        },
      });
    });
  });
});
