import { getRelationalFields } from '../relations';

describe('Relations', () => {
  describe('getRelationalFields', () => {
    test('Attribute must have a type relation', () => {
      expect(
        getRelationalFields({
          kind: 'collectionType',
          info: {
            singularName: 'test',
            pluralName: 'test',
          },
          options: {
            populateCreatorFields: false,
          },
          attributes: {
            rel: {
              type: 'relation',
            },
            title: {
              type: 'string',
            },
          },
        })
      ).toEqual(['rel']);
    });
  });
});
