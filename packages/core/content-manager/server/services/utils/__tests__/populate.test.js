'use strict';

const { getDeepPopulate } = require('../populate');

describe('Populate', () => {
  const fakeModels = {
    empty: {
      modelName: 'Fake empty model',
      attributes: {},
    },
    component: {
      modelName: 'Fake component model',
      attributes: {
        componentAttrName: {
          type: 'component',
          component: 'empty',
        },
      },
    },
    dynZone: {
      modelName: 'Fake dynamic zone model',
      attributes: {
        dynZoneAttrName: {
          type: 'dynamiczone',
          components: ['empty', 'component'],
        },
      },
    },
    relationOTM: {
      modelName: 'Fake relation oneToMany model',
      attributes: {
        relationAttrName: {
          type: 'relation',
          relation: 'oneToMany',
        },
      },
    },
    relationOTO: {
      modelName: 'Fake relation oneToOne model',
      attributes: {
        relationAttrName: {
          type: 'relation',
          relation: 'oneToOne',
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

  describe('getDeepPopulate', () => {
    beforeEach(() => {
      global.strapi = {
        getModel: jest.fn((uid) => fakeModels[uid]),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('with empty model', async () => {
      const uid = 'empty';

      const result = getDeepPopulate(uid);

      expect(result).toEqual({});
    });

    test('with component model', async () => {
      const uid = 'component';

      const result = getDeepPopulate(uid);

      expect(result).toEqual({
        componentAttrName: { populate: {} },
      });
    });

    test('with dynamic zone model', async () => {
      const uid = 'dynZone';

      const result = getDeepPopulate(uid);

      expect(result).toEqual({
        dynZoneAttrName: {
          on: {
            component: {
              populate: {
                componentAttrName: {
                  populate: {},
                },
              },
            },
            empty: {
              populate: {},
            },
          },
        },
      });
    });

    test('with relation model - oneToMany', async () => {
      const uid = 'relationOTM';

      const result = getDeepPopulate(uid);

      expect(result).toEqual({
        relationAttrName: true,
      });
    });

    test('with relation model - oneToMany - with countMany', async () => {
      const uid = 'relationOTM';

      const result = getDeepPopulate(uid, { countMany: true });

      expect(result).toEqual({
        relationAttrName: { count: true },
      });
    });

    test('with relation model - oneToOne', async () => {
      const uid = 'relationOTO';

      const result = getDeepPopulate(uid);

      expect(result).toEqual({
        relationAttrName: true,
      });
    });

    test('with relation model - oneToOne - with countOne', async () => {
      const uid = 'relationOTO';

      const result = getDeepPopulate(uid, { countOne: true });

      expect(result).toEqual({
        relationAttrName: { count: true },
      });
    });

    test('with media model', async () => {
      const uid = 'media';

      const result = getDeepPopulate(uid);

      expect(result).toEqual({
        mediaAttrName: { populate: 'folder' },
      });
    });
  });
});
