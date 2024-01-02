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
        'admin::relationMTM'
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
          id: 1,
          relationAttrName: {
            id: 2,
            name: 'rel1',
          },
        },
        'admin::relationOTO'
      );

      expect(count).toEqual({
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
      const count = getDeepRelationsCount(mediaEntity, 'admin::media');

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
        'component.component'
      );

      expect(count).toEqual({
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
        'component.component'
      );

      expect(count).toEqual({
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
        'component.repeatableComponent'
      );

      expect(count).toEqual({
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
        'component.dynZone'
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
