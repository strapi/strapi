'use strict';

const { getQueryPopulate } = require('../populate');

const getFilterQuery = (conditions) => ({
  filters: {
    $or: [{
      $and: [{
        $or: conditions
      }]
    }]
  }
})

const uid = 'model';

describe('Populate', () => {
  const fakeModels = {
    empty: {
      uid: 'empty',
      attributes: {},
    },
    model: {
      uid: 'model',
      attributes: {
        field: {
          type: 'string',
        },
        relation: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'model',
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
        }
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
          target: 'model',
        }
      },
    },
  };

  describe('getQueryPopulate', () => {
    beforeEach(() => {
      global.strapi = {
        contentType: jest.fn((uid) => fakeModels[uid]),
        getModel: jest.fn((uid) => fakeModels[uid]),
        db: {
          metadata: {
            get: jest.fn((uid) => ({ ...fakeModels[uid], columnToAttribute: {} })),
          }
        }
      };
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

      const query = getFilterQuery([{ relation: { field: "value" } }]);
      const result = await getQueryPopulate(uid, query);

      expect(result).toEqual({
        relation: { fields: ['field'] }
      });

    });

    test('relation in component should be populated', async () => {

      const query = getFilterQuery([{ component: { compoRelation: { field: "value" } } }]);
      const result = await getQueryPopulate(uid, query);

      expect(result).toEqual({
        component: { populate: { compoRelation: { fields: ['field'] } }, fields: [] }
      });

    });

    test('relation in repeatable component should be populated', async () => {

      const query = getFilterQuery([{ repeatableComponent: { compoRelation: { field: "value" } } }]);
      const result = await getQueryPopulate(uid, query);

      expect(result).toEqual({
        repeatableComponent: { populate: { compoRelation: { fields: ['field'] } }, fields: [] }
      });

    });

    test('populate multiple fields at once', async () => {

      const query = getFilterQuery([
        { relation: { component: { field: { $eq: "value" } } } },
        { relation: { field: "value" } },
        { repeatableComponent: { $elemMatch: { compoRelation: { field: "value" } } } }
      ]);

      const result = await getQueryPopulate(uid, query);

      expect(result).toEqual({
        relation: { fields: ['field'], populate: { component: { fields: ['field'] } } },
        repeatableComponent: { populate: { compoRelation: { fields: ['field'] } }, fields: [] }
      });
    });

  });

});
