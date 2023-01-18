'use strict';

const { getDeepRelationsCount } = require('../count');

const fakeModels = {
  component: {
    modelName: 'Fake component model',
    attributes: {
      componentAttrName: {
        type: 'component',
        component: 'relationMTM',
      },
    },
  },
  dynZone: {
    modelName: 'Fake dynamic zone model',
    attributes: {
      dynZoneAttrName: {
        type: 'dynamiczone',
        components: ['component'],
      },
    },
  },
  relationMTM: {
    modelName: 'Fake relation manyToMany model',
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

describe('Count', () => {
  describe('getDeepRelationsCount', () => {
    beforeEach(() => {
      global.strapi = {
        getModel: jest.fn((uid) => fakeModels[uid]),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('with many to many', () => {
      const count = getDeepRelationsCount(
        {
          relationAttrName: [
            {
              id: 2,
              name: 'rel1',
            },
            {
              id: 7,
              name: 'rel2',
            },
          ],
        },
        'relationMTM'
      );

      expect(count).toEqual({
        relationAttrName: {
          count: 2,
        },
      });
    });

    test('with one to one', () => {
      const count = getDeepRelationsCount(
        {
          relationAttrName: {
            id: 2,
            name: 'rel1',
          },
        },
        'relationOTO'
      );

      expect(count).toEqual({
        relationAttrName: {
          count: 1,
        },
      });
    });

    test('with media', () => {
      const mediaEntity = {
        mediaAttrName: { id: 1, name: 'img1' },
      };
      const count = getDeepRelationsCount(mediaEntity, 'media');

      expect(count).toEqual(mediaEntity);
    });

    test('with component', () => {
      const count = getDeepRelationsCount(
        {
          componentAttrName: {
            relationAttrName: [
              {
                id: 2,
                name: 'rel1',
              },
              {
                id: 7,
                name: 'rel2',
              },
            ],
          },
        },
        'component'
      );

      expect(count).toEqual({
        componentAttrName: {
          relationAttrName: {
            count: 2,
          },
        },
      });
    });

    test('with dynamic zone', () => {
      const count = getDeepRelationsCount(
        {
          dynZoneAttrName: [
            {
              __component: 'component',
              componentAttrName: {
                relationAttrName: [
                  {
                    id: 2,
                    name: 'rel1',
                  },
                  {
                    id: 7,
                    name: 'rel2',
                  },
                ],
              },
            },
          ],
        },
        'dynZone'
      );

      expect(count).toEqual({
        dynZoneAttrName: [
          {
            __component: 'component',
            componentAttrName: {
              relationAttrName: {
                count: 2,
              },
            },
          },
        ],
      });
    });
  });
});
