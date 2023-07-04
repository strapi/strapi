import convertQueryParams from '../convert-query-params';
import { Model } from '../types';

const schema: Model = {
  kind: 'collectionType',
  info: {
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
    createdAt: { type: 'timestamp' },
    updatedAt: { type: 'timestamp' },
  },
};

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

      const res = convertQueryParams.convertFiltersQueryParams(input, schema);
      expect(res).toEqual(expectedOutput);
    });

    // test filters that should be removed
    test.each<[string, object]>([
      ['invalid attribute', { invAttribute: 'test' }],
      ['invalid operator', { $nope: 'test' }],
      ['uppercase operator', { $GT: new Date() }],
    ])('removes: %s', (key, input) => {
      const res = convertQueryParams.convertFiltersQueryParams(input, schema);
      expect(res).toEqual({});
    });

    test.todo('partial filtering works');
  });

  test.todo('convertSortQueryParams');
  test.todo('convertStartQueryParams');
  test.todo('convertLimitQueryParams');
  test.todo('convertPopulateQueryParams');
  test.todo('convertFieldsQueryParams');
  test.todo('convertPublicationStateParams');
  test.todo('transformParamsToQuery');
});
