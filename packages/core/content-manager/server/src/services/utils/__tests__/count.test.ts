import { getDeepRelationsCount } from '../count';

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
  repeatableComponent: {
    modelName: 'Fake repeatable component model',
    attributes: {
      repeatableComponentAttrName: {
        type: 'component',
        repeatable: true,
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
} as any;

describe('getDeepRelationsCount', () => {
  beforeEach(() => {
    global.strapi = {
      getModel: jest.fn((uid) => fakeModels[uid]),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('relation fields', () => {
    test('with many to many', () => {
      const count = getDeepRelationsCount(
        {
          id: 1,
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
        // @ts-expect-error – fake model, the data would have to change to satisfy the type
        'relationMTM'
      );

      expect(count).toEqual({
        id: 1,
        relationAttrName: {
          count: 2,
        },
      });
    });

    test('with one to one', () => {
      const count = getDeepRelationsCount(
        {
          id: 1,
          relationAttrName: {
            id: 2,
            name: 'rel1',
          },
        },
        // @ts-expect-error – fake model, the data would have to change to satisfy the type
        'relationOTO'
      );

      expect(count).toEqual({
        id: 1,
        relationAttrName: {
          count: 1,
        },
      });
    });
  });

  describe('media fields', () => {
    test('with media', () => {
      const mediaEntity = {
        id: 1,
        mediaAttrName: { id: 1, name: 'img1' },
      };
      // @ts-expect-error – fake model, the data would have to change to satisfy the type
      const count = getDeepRelationsCount(mediaEntity, 'media');

      expect(count).toEqual(mediaEntity);
    });
  });

  describe('component fields', () => {
    test('with component', () => {
      const count = getDeepRelationsCount(
        {
          id: 1,
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
        // @ts-expect-error – fake model, the data would have to change to satisfy the type
        'component'
      );

      expect(count).toEqual({
        id: 1,
        componentAttrName: {
          relationAttrName: {
            count: 2,
          },
        },
      });
    });

    test('with empty component', () => {
      const count = getDeepRelationsCount(
        {
          id: 1,
          componentAttrName: null,
        },
        // @ts-expect-error – fake model, the data would have to change to satisfy the type
        'component'
      );

      expect(count).toEqual({
        id: 1,
        componentAttrName: null,
      });
    });

    test('with repeatable component', () => {
      const count = getDeepRelationsCount(
        {
          id: 1,
          repeatableComponentAttrName: [
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
          ],
        },
        // @ts-expect-error – fake model, the data would have to change to satisfy the type
        'repeatableComponent'
      );

      expect(count).toEqual({
        id: 1,
        repeatableComponentAttrName: [
          {
            relationAttrName: {
              count: 2,
            },
          },
        ],
      });
    });
  });

  describe('dynamic zone fields', () => {
    test('with dynamic zone', () => {
      const count = getDeepRelationsCount(
        {
          id: 1,
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
        // @ts-expect-error – fake model, the data would have to change to satisfy the type
        'dynZone'
      );

      expect(count).toEqual({
        id: 1,
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
