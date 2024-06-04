import { createTransformer } from '../convert-query-params';
import { Model } from '../types';

const models = {
  'api::dog.dog': {
    uid: 'api::dog.dog',
    modelType: 'contentType',
    kind: 'collectionType',
    info: {
      displayName: 'Dog',
      singularName: 'dog',
      pluralName: 'dogs',
    },
    options: {
      populateCreatorFields: true,
    },
    attributes: {
      title: {
        type: 'string',
      },
      dz: { type: 'dynamiczone', components: ['default.cpa', 'default.cpb'] },
      morph_to_one: { type: 'relation', relation: 'morphToOne' },
      morph_to_many: { type: 'relation', relation: 'morphToMany' },
      createdAt: { type: 'timestamp' },
      updatedAt: { type: 'timestamp' },
    },
  },
  'default.cpa': {
    uid: 'default.cpa',
    modelType: 'component',
    attributes: {
      field: { type: 'string' },
    },
  },
  'default.cpb': {
    uid: 'default.cpb',
    modelType: 'component',
    attributes: {
      field: { type: 'integer' },
    },
  },
} satisfies Record<string, Model>;

const { private_convertFiltersQueryParams, private_convertPopulateQueryParams } = createTransformer(
  {
    getModel: (uid: string) => models[uid],
  }
);

describe('convert-query-params', () => {
  describe('convertFiltersQueryParams', () => {
    // test filters that should be kept
    test.each<[string, object]>([
      ['id', { id: 1234 }],
      ['string', { title: 'Hello World' }],
      ['Date', { createdAt: new Date() }],
      ['$gt Date', { createdAt: { $gt: new Date() } }],
      ['$gt string', { createdAt: { $gt: '2022-03-17T15:06:57.878Z' } }],
      ['$gt number', { createdAt: { $gt: 1234 } }],
      ['$gt number', { createdAt: { $gt: 1234 } }],
      ['$and', { $and: [{ title: 'value' }, { createdAt: { $gt: new Date() } }] }],
      ['$between Date Date', { $between: [new Date(), new Date()] }],
      ['$between String Date', { $between: ['2022-03-17T15:06:57.878Z', new Date()] }],
      [
        '$between String String',
        { $between: ['2022-03-17T15:06:57.878Z', '2022-03-17T15:06:57.878Z'] },
      ],
    ])('keeps: %s', (key, input) => {
      const expectedOutput = { ...input };

      const res = private_convertFiltersQueryParams(input, models['api::dog.dog']);
      expect(res).toEqual(expectedOutput);
    });

    // test filters that should be removed
    test.each<[string, object]>([
      ['invalid attribute', { invAttribute: 'test' }],
      ['invalid operator', { $nope: 'test' }],
      ['uppercase operator', { $GT: new Date() }],
    ])('removes: %s', (key, input) => {
      const res = private_convertFiltersQueryParams(input, models['api::dog.dog']);
      expect(res).toEqual({});
    });

    test.todo('partial filtering works');
  });

  test.todo('convertSortQueryParams');
  test.todo('convertStartQueryParams');
  test.todo('convertLimitQueryParams');

  describe('convertPopulateQueryParams', () => {
    describe('Morph-Like Attributes', () => {
      test.each<[label: string, key: string]>([
        ['dynamic zone', 'dz'],
        ['morph to one', 'morph_to_one'],
        ['morph to many', 'morph_to_many'],
      ])('Invalid populate property for %s', (_, key) => {
        const invalidPopulate = { [key]: { filters: { id: { $in: [1, 2, 3] } } } };

        expect(() =>
          private_convertPopulateQueryParams(invalidPopulate, models['api::dog.dog'])
        ).toThrowError(
          `Invalid nested populate for dog.${key} (api::dog.dog). Expected a fragment ("on") or "count" but found {"filters":{"id":{"$in":[1,2,3]}}}`
        );
      });

      test.each(['morph_to_one', 'morph_to_many'])(
        'Morph (%s) relation can define a populate fragment',
        (key) => {
          const populate = {
            [key]: { on: { 'api::dog.dog': { fields: ['title'], populate: 'createdBy' } } },
          };

          const newPopulate = private_convertPopulateQueryParams(populate, models['api::dog.dog']);

          expect(newPopulate).toStrictEqual({
            [key]: {
              on: {
                'api::dog.dog': { populate: ['createdBy'], select: ['id', 'documentId', 'title'] },
              },
            },
          });
        }
      );

      test('Dynamic zone can define a populate fragment', () => {
        const populate = {
          dz: {
            on: {
              'default.cpa': { filters: { field: { $contains: 'foo' } } },
              'default.cpb': { filters: { field: { $gt: 0 } } },
            },
          },
        };

        const newPopulate = private_convertPopulateQueryParams(populate, models['api::dog.dog']);

        expect(newPopulate).toStrictEqual({
          dz: {
            on: {
              'default.cpa': { where: { field: { $contains: 'foo' } } },
              'default.cpb': { where: { field: { $gt: 0 } } },
            },
          },
        });
      });

      test.each<[label: string, key: string]>([
        ['dynamic zone', 'dz'],
        ['morph to one', 'morph_to_one'],
        ['morph to many', 'morph_to_many'],
      ])('%s attributes can request a count', (_, key) => {
        const populate = { [key]: { count: true } };

        const newPopulate = private_convertPopulateQueryParams(populate, models['api::dog.dog']);

        expect(newPopulate).toStrictEqual({ [key]: { count: true } });
      });
    });
  });

  test.todo('convertFieldsQueryParams');
  test.todo('transformParamsToQuery');
});
