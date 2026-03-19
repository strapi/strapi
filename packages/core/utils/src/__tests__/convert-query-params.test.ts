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
      one_to_one: { type: 'relation', relation: 'oneToOne', target: 'api::dog.dog' },
      cpa: { type: 'component', component: 'default.cpa' },
      cpb: { type: 'component', component: 'default.cpb' },
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

const transformer = createTransformer({
  getModel: (uid: string) => models[uid],
});

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

      const res = transformer.private_convertFiltersQueryParams(input, models['api::dog.dog']);
      expect(res).toEqual(expectedOutput);
    });

    // test filters that should be removed
    test.each<[string, object]>([
      ['invalid attribute', { invAttribute: 'test' }],
      ['invalid operator', { $nope: 'test' }],
      ['uppercase operator', { $GT: new Date() }],
    ])('removes: %s', (key, input) => {
      const res = transformer.private_convertFiltersQueryParams(input, models['api::dog.dog']);
      expect(res).toEqual({});
    });

    test.todo('partial filtering works');
  });

  test.todo('convertSortQueryParams');

  describe('convertStartQueryParams', () => {
    it('accepts valid non-negative integers', () => {
      expect(transformer.private_convertStartQueryParams(0)).toBe(0);
      expect(transformer.private_convertStartQueryParams(1)).toBe(1);
      expect(transformer.private_convertStartQueryParams(100)).toBe(100);
    });

    it('coerces string numbers to integer', () => {
      expect(transformer.private_convertStartQueryParams('0')).toBe(0);
      expect(transformer.private_convertStartQueryParams('5')).toBe(5);
      expect(transformer.private_convertStartQueryParams('  10  ')).toBe(10);
    });

    it('throws for negative values', () => {
      expect(() => transformer.private_convertStartQueryParams(-1)).toThrow(
        'convertStartQueryParams expected a positive integer got -1'
      );
      expect(() => transformer.private_convertStartQueryParams('-1')).toThrow(
        'convertStartQueryParams expected a positive integer'
      );
    });

    it('throws for non-integer numbers', () => {
      expect(() => transformer.private_convertStartQueryParams(1.5)).toThrow(
        'convertStartQueryParams expected a positive integer got 1.5'
      );
      expect(() => transformer.private_convertStartQueryParams('1.5')).toThrow(
        'convertStartQueryParams expected a positive integer'
      );
    });

    it('throws for invalid or NaN values', () => {
      expect(() => transformer.private_convertStartQueryParams('invalid')).toThrow(
        'convertStartQueryParams expected a positive integer'
      );
      expect(() => transformer.private_convertStartQueryParams(NaN)).toThrow(
        'convertStartQueryParams expected a positive integer'
      );
      expect(() => transformer.private_convertStartQueryParams(undefined)).toThrow(
        'convertStartQueryParams expected a positive integer'
      );
    });
  });

  describe('convertLimitQueryParams', () => {
    it('accepts valid positive integers', () => {
      expect(transformer.private_convertLimitQueryParams(1)).toBe(1);
      expect(transformer.private_convertLimitQueryParams(10)).toBe(10);
      expect(transformer.private_convertLimitQueryParams(100)).toBe(100);
    });

    it('returns undefined for -1 (unlimited)', () => {
      expect(transformer.private_convertLimitQueryParams(-1)).toBeUndefined();
      expect(transformer.private_convertLimitQueryParams('-1')).toBeUndefined();
    });

    it('coerces string numbers to integer', () => {
      expect(transformer.private_convertLimitQueryParams('10')).toBe(10);
      expect(transformer.private_convertLimitQueryParams('  25  ')).toBe(25);
    });

    it('throws for negative (except -1)', () => {
      expect(() => transformer.private_convertLimitQueryParams(-2)).toThrow(
        'convertLimitQueryParams expected a positive integer got -2'
      );
      expect(() => transformer.private_convertLimitQueryParams('-2')).toThrow(
        'convertLimitQueryParams expected a positive integer'
      );
    });

    it('throws for non-integer numbers', () => {
      expect(() => transformer.private_convertLimitQueryParams(1.5)).toThrow(
        'convertLimitQueryParams expected a positive integer'
      );
    });

    it('throws for invalid or NaN values', () => {
      expect(() => transformer.private_convertLimitQueryParams('invalid')).toThrow(
        'convertLimitQueryParams expected a positive integer'
      );
      expect(() => transformer.private_convertLimitQueryParams(NaN)).toThrow(
        'convertLimitQueryParams expected a positive integer'
      );
    });
  });

  describe('convertPopulateQueryParams', () => {
    describe('Fields selection', () => {
      test('should not select documentId when selecting fields for components', () => {
        const populate = {
          cpa: { fields: ['field'] },
          cpb: { fields: ['field'] },
        };

        const newPopulate = transformer.private_convertPopulateQueryParams(
          populate,
          models['api::dog.dog']
        );

        expect(newPopulate).toStrictEqual({
          cpa: { select: ['id', 'field'] },
          cpb: { select: ['id', 'field'] },
        });
      });

      test('should select documentId for non-component populate', () => {
        const populate = {
          one_to_one: { fields: ['title'] },
        };

        const newPopulate = transformer.private_convertPopulateQueryParams(
          populate,
          models['api::dog.dog']
        );

        expect(newPopulate).toStrictEqual({
          one_to_one: { select: ['id', 'documentId', 'title'] },
        });
      });
    });

    describe('Morph-Like Attributes', () => {
      test.each<[label: string, key: string]>([
        ['dynamic zone', 'dz'],
        ['morph to one', 'morph_to_one'],
        ['morph to many', 'morph_to_many'],
      ])('Invalid populate property for %s', (_, key) => {
        const invalidPopulate = { [key]: { filters: { id: { $in: [1, 2, 3] } } } };

        expect(() =>
          transformer.private_convertPopulateQueryParams(invalidPopulate, models['api::dog.dog'])
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

          const newPopulate = transformer.private_convertPopulateQueryParams(
            populate,
            models['api::dog.dog']
          );

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

        const newPopulate = transformer.private_convertPopulateQueryParams(
          populate,
          models['api::dog.dog']
        );

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

        const newPopulate = transformer.private_convertPopulateQueryParams(
          populate,
          models['api::dog.dog']
        );

        expect(newPopulate).toStrictEqual({ [key]: { count: true } });
      });
    });
  });

  test.todo('convertFieldsQueryParams');

  describe('transformQueryParams', () => {
    it('includes all supported params in the result (page-based pagination)', () => {
      const params = {
        filters: { title: 'Hello' },
        sort: { title: 'asc' },
        fields: ['title', 'createdAt'],
        populate: { one_to_one: true },
        page: 1,
        pageSize: 10,
        status: 'published' as const,
        _q: 'search',
        count: true,
        ordering: { title: 'asc' },
        unknownParam: 'ignored',
      };

      const result = transformer.transformQueryParams('api::dog.dog', params);

      expect(result.where).toEqual({ title: 'Hello' });
      expect(result.orderBy).toEqual({ title: 'asc' });
      expect(result.select).toBeDefined();
      expect(result.populate).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.filters).toBeDefined();
      expect(typeof result.filters).toBe('function');
      expect(result._q).toBe('search');
      expect(result.count).toBe(true);
      expect(result.ordering).toEqual({ title: 'asc' });
      expect(result).toHaveProperty('unknownParam', 'ignored');
    });

    it('includes offset and limit when using start/limit pagination', () => {
      const params = {
        filters: { id: { $gt: 0 } },
        start: 5,
        limit: 20,
      };

      const result = transformer.transformQueryParams('api::dog.dog', params);

      expect(result.where).toEqual({ id: { $gt: 0 } });
      expect(result.offset).toBe(5);
      expect(result.limit).toBe(20);
    });

    describe('page and pageSize (string→number coercion)', () => {
      it('accepts numeric page and pageSize', () => {
        const result = transformer.transformQueryParams('api::dog.dog', {
          page: 2,
          pageSize: 20,
        });
        expect(result.page).toBe(2);
        expect(result.pageSize).toBe(20);
      });

      it('coerces string page and pageSize to numbers', () => {
        const result = transformer.transformQueryParams('api::dog.dog', {
          page: '2',
          pageSize: '20',
        });
        expect(result.page).toBe(2);
        expect(result.pageSize).toBe(20);
      });

      it('throws PaginationError for invalid page (non-integer or <= 0)', () => {
        expect(() =>
          transformer.transformQueryParams('api::dog.dog', { page: 0, pageSize: 10 })
        ).toThrow(/Invalid 'page' parameter/);
        expect(() =>
          transformer.transformQueryParams('api::dog.dog', { page: 'invalid', pageSize: 10 })
        ).toThrow(/Invalid 'page' parameter/);
        expect(() =>
          transformer.transformQueryParams('api::dog.dog', { page: -1, pageSize: 10 })
        ).toThrow(/Invalid 'page' parameter/);
      });

      it('throws PaginationError for invalid pageSize (non-integer or <= 0)', () => {
        expect(() =>
          transformer.transformQueryParams('api::dog.dog', { page: 1, pageSize: 0 })
        ).toThrow(/Invalid 'pageSize' parameter/);
        expect(() =>
          transformer.transformQueryParams('api::dog.dog', { page: 1, pageSize: 'invalid' })
        ).toThrow(/Invalid 'pageSize' parameter/);
      });
    });
  });

  test.todo('transformParamsToQuery');
});
