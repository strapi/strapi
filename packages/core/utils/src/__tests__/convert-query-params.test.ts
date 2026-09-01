import { createTransformer, type Params } from '../convert-query-params';
import { ValidationError } from '../errors';
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
      image: { type: 'media', multiple: false },
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

  describe('convertSortQueryParams', () => {
    test.each<[string, unknown, object]>([
      ['single field string', 'title:asc', [{ title: 'asc' }]],
      ['defaults to asc when order is omitted', 'title', [{ title: 'asc' }]],
      ['is case insensitive on order', 'title:DESC', [{ title: 'DESC' }]],
      [
        'array of field strings',
        ['title:asc', 'createdAt:desc'],
        [{ title: 'asc' }, { createdAt: 'desc' }],
      ],
      [
        'comma-separated field string',
        'title:asc,createdAt:desc',
        [{ title: 'asc' }, { createdAt: 'desc' }],
      ],
      ['nested sort object', { title: 'asc' }, { title: 'asc' }],
    ])('accepts: %s', (key, input, expectedOutput) => {
      const res = transformer.private_convertSortQueryParams(input as never);
      expect(res).toEqual(expectedOutput);
    });

    test.each<[string, unknown]>([
      ['invalid order suffix', 'title:asc$'],
      ['unsupported order value', 'title:ascending'],
      ['unsupported order value on a nested sort object', { title: 'ascending' }],
    ])('rejects with a ValidationError: %s', (key, input) => {
      expect(() => transformer.private_convertSortQueryParams(input as never)).toThrow(
        ValidationError
      );
      expect(() => transformer.private_convertSortQueryParams(input as never)).toThrow(
        'Invalid order. order can only be one of asc|desc|ASC|DESC'
      );
    });

    test.each<[string, unknown, string]>([
      [
        'invalid nested sort value type',
        { title: 123 },
        'Invalid sort type expected object or string got number',
      ],
    ])('rejects with a ValidationError: %s', (key, input, message) => {
      expect(() => transformer.private_convertSortQueryParams(input as never)).toThrow(
        ValidationError
      );
      expect(() => transformer.private_convertSortQueryParams(input as never)).toThrow(message);
    });

    test.each<[string, unknown]>([
      ['a number', 1234],
      ['null', null],
    ])('rejects with a ValidationError: %s', (key, input) => {
      expect(() => transformer.private_convertSortQueryParams(input as never)).toThrow(
        ValidationError
      );
      expect(() => transformer.private_convertSortQueryParams(input as never)).toThrow(
        'Invalid sort parameter. Expected a string, an array of strings, a sort object or an array of sort objects'
      );
    });
  });

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
    test.each<[string, unknown]>([
      ['a number', 1234],
      ['null', null],
      ['an array with a non-string entry', ['title', 1234]],
    ])('rejects with a ValidationError: %s', (key, input) => {
      expect(() =>
        transformer.private_convertPopulateQueryParams(input as never, models['api::dog.dog'])
      ).toThrow(ValidationError);
      expect(() =>
        transformer.private_convertPopulateQueryParams(input as never, models['api::dog.dog'])
      ).toThrow(
        'Invalid populate parameter. Expected a string, an array of strings, a populate object'
      );
    });

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

      test.each<[label: string, key: string, populateValue: null | undefined]>([
        ['dynamic zone', 'dz', null],
        ['dynamic zone', 'dz', undefined],
        ['morph to one', 'morph_to_one', null],
        ['morph to one', 'morph_to_one', undefined],
        ['morph to many', 'morph_to_many', null],
        ['morph to many', 'morph_to_many', undefined],
      ])('%s attributes ignore nil wildcard populate (%s)', (_, key, populateValue) => {
        const populate = { [key]: { populate: populateValue } };

        const newPopulate = transformer.private_convertPopulateQueryParams(
          populate,
          models['api::dog.dog']
        );

        expect(newPopulate).toStrictEqual({ [key]: {} });
      });

      test.each<[label: string, key: string]>([
        ['dynamic zone', 'dz'],
        ['morph to one', 'morph_to_one'],
        ['morph to many', 'morph_to_many'],
      ])('%s attributes accept wildcard populate only as *', (_, key) => {
        const populate = { [key]: { populate: '*' } };

        const newPopulate = transformer.private_convertPopulateQueryParams(
          populate,
          models['api::dog.dog']
        );

        expect(newPopulate).toStrictEqual({ [key]: { populate: true } });
      });

      const invalidPolymorphicNestedPopulateMessage =
        `Invalid nested population query detected. When using 'populate' within polymorphic structures, ` +
        `its value must be '*' to indicate all second level links. Specific field targeting is not supported here. ` +
        `Consider using the fragment API for more granular population control.`;

      test.each<[label: string, key: string]>([
        ['dynamic zone', 'dz'],
        ['morph to one', 'morph_to_one'],
        ['morph to many', 'morph_to_many'],
      ])('%s attributes reject non-wildcard string populate', (_, key) => {
        const populate = { [key]: { populate: 'deep' } };

        expect(() =>
          transformer.private_convertPopulateQueryParams(populate, models['api::dog.dog'])
        ).toThrowError(invalidPolymorphicNestedPopulateMessage);
      });

      test.each<[label: string, key: string]>([
        ['dynamic zone', 'dz'],
        ['morph to one', 'morph_to_one'],
        ['morph to many', 'morph_to_many'],
      ])('%s attributes reject object populate', (_, key) => {
        const populate = { [key]: { populate: { title: true } } };

        expect(() =>
          transformer.private_convertPopulateQueryParams(populate, models['api::dog.dog'])
        ).toThrowError(invalidPolymorphicNestedPopulateMessage);
      });

      test('array populate strings stay arrays (dot notation for dynamic zone)', () => {
        const populate = ['dz', 'dz.field'];

        expect(
          transformer.private_convertPopulateQueryParams(populate, models['api::dog.dog'])
        ).toStrictEqual(['dz', 'dz.field']);
      });
    });

    test('bracket notation populate[image]=* should work', () => {
      const populate = {
        image: { '*': '' },
      };

      const newPopulate = transformer.private_convertPopulateQueryParams(
        populate,
        models['api::dog.dog']
      );

      expect(newPopulate).toStrictEqual({ image: true });
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

      const result = transformer.transformQueryParams('api::dog.dog', params as unknown as Params);

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

  describe('transformQueryParams', () => {
    it.each<[string, Params]>([
      ['missing sort', {}],
      ['null sort', { sort: null } as unknown as Params],
      ['empty sort array', { sort: [] }],
      ['empty sort string', { sort: '' }],
      ['comma-only sort string', { sort: ',' }],
      ['empty sort object', { sort: {} }],
      ['array of empty strings', { sort: [''] }],
      ['array of empty sort objects', { sort: [{}] }],
      ['array with only null (qs sort[])', { sort: [null] } as unknown as Params],
      ['object sort with empty order', { sort: { title: '' } } as unknown as Params],
    ])('treats %s as no sort', (_label, params) => {
      const result = transformer.transformQueryParams('api::dog.dog', {
        ...params,
        limit: 10,
      });

      expect(result.orderBy).toBeUndefined();
      expect(result.limit).toBe(10);
    });

    it('still applies sort when a field is present', () => {
      const result = transformer.transformQueryParams('api::dog.dog', {
        sort: 'title:asc',
        limit: 10,
      });

      expect(result.orderBy).toEqual([{ title: 'asc' }]);
    });

    it.each([
      ['trailing comma', 'title:asc,', [{ title: 'asc' }]],
      ['trailing comma and space', 'title:asc, ', [{ title: 'asc' }]],
      [
        'multiple fields with trailing comma',
        'title:asc,createdAt:desc,',
        [{ title: 'asc' }, { createdAt: 'desc' }],
      ],
    ])('drops empty segments from %s', (_label, sort, expectedOrderBy) => {
      const result = transformer.transformQueryParams('api::dog.dog', {
        sort,
        limit: 10,
      });

      expect(result.orderBy).toEqual(expectedOrderBy);
    });

    it.each([
      ['empty sort array', []],
      ['empty sort string', ''],
      ['comma-only sort string', ','],
    ])('does not set nested populate orderBy for %s', (_label, sortValue) => {
      const result = transformer.transformQueryParams('api::dog.dog', {
        populate: {
          one_to_one: {
            sort: sortValue,
            limit: 5,
          },
        },
      });

      expect(result.populate).toMatchObject({
        one_to_one: { limit: 5 },
      });
      expect(
        (result.populate as { one_to_one?: Record<string, unknown> }).one_to_one
      ).not.toHaveProperty('orderBy');
    });

    it('sets nested populate orderBy when sort has a field', () => {
      const result = transformer.transformQueryParams('api::dog.dog', {
        populate: {
          one_to_one: {
            sort: 'title:asc',
            limit: 5,
          },
        },
      });

      expect(result.populate).toMatchObject({
        one_to_one: {
          orderBy: [{ title: 'asc' }],
          limit: 5,
        },
      });
    });

    it('drops trailing comma segments in nested populate sort', () => {
      const result = transformer.transformQueryParams('api::dog.dog', {
        populate: {
          one_to_one: {
            sort: 'title:asc,',
            limit: 5,
          },
        },
      });

      expect(result.populate).toMatchObject({
        one_to_one: {
          orderBy: [{ title: 'asc' }],
          limit: 5,
        },
      });
    });
  });

  test.todo('transformParamsToQuery');
});
