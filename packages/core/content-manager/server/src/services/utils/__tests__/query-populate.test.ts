import { getQueryPopulate } from '../populate';

const getFilterQuery = (conditions: any) => ({
  filters: {
    $or: [
      {
        $and: [
          {
            $or: conditions,
          },
        ],
      },
    ],
  },
});

const uid = 'api::model.model';

describe('Populate', () => {
  const fakeModels = {
    empty: {
      uid: 'empty',
      attributes: {},
    },
    [uid]: {
      uid: 'api::model.model',
      attributes: {
        field: {
          type: 'string',
        },
        relation: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::model.model',
        },
        // Edge case: an attribute named "populate" should be populated
        populate: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::model.model',
        },
        component: {
          type: 'component',
          component: 'component',
        },
        repeatableComponent: {
          type: 'component',
          repeatable: true,
          component: 'component',
        },
        media: {
          type: 'media',
        },
      },
    },
    component: {
      uid: 'component',
      attributes: {
        field: {
          type: 'string',
        },
        compoRelation: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::model.model',
        },
      },
    },
  } as any;

  describe('getQueryPopulate', () => {
    beforeEach(() => {
      global.strapi = {
        contentType: jest.fn((uid) => fakeModels[uid]),
        getModel: jest.fn((uid) => fakeModels[uid]),
        db: {
          metadata: {
            get: jest.fn((uid) => ({ ...fakeModels[uid], columnToAttribute: {} })),
          },
        },
      } as any;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    test('top level field should not be populated', async () => {
      const query = getFilterQuery([{ field: { $exists: true } }]);
      const result = await getQueryPopulate(uid, query);

      expect(result).toEqual({});
    });

    test('one relational field should be populated', async () => {
      const query = getFilterQuery([{ relation: { field: 'value' } }]);
      const result = await getQueryPopulate(uid, query);

      expect(result).toEqual({
        relation: {},
      });
    });

    test('one relational field named populate should be populated', async () => {
      const query = getFilterQuery([{ populate: { populate: { field: 'value' } } }]);
      const result = await getQueryPopulate(uid, query);

      // Populate train! Choo choo!
      expect(result).toEqual({
        populate: {
          populate: {
            populate: {},
          },
        },
      });
    });

    test('relation in component should be populated', async () => {
      const query = getFilterQuery([{ component: { compoRelation: { field: 'value' } } }]);
      const result = await getQueryPopulate(uid, query);

      expect(result).toEqual({
        component: { populate: { compoRelation: {} } },
      });
    });

    test('relation in repeatable component should be populated', async () => {
      const query = getFilterQuery([
        { repeatableComponent: { compoRelation: { field: 'value' } } },
      ]);
      const result = await getQueryPopulate(uid, query);

      expect(result).toEqual({
        repeatableComponent: { populate: { compoRelation: {} } },
      });
    });

    test('populate multiple fields at once', async () => {
      const query = getFilterQuery([
        { relation: { component: { field: { $eq: 'value' } } } },
        { relation: { field: 'value' } },
        { repeatableComponent: { $elemMatch: { compoRelation: { field: 'value' } } } },
      ]);

      const result = await getQueryPopulate(uid, query);

      expect(result).toEqual({
        relation: { populate: { component: {} } },
        repeatableComponent: { populate: { compoRelation: {} } },
      });
    });
  });
});
