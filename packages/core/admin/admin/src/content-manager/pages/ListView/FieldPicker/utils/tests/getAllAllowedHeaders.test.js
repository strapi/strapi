import getAllAllowedHeaders from '../getAllAllowedHeader';

describe('CONTENT MANAGER | containers | ListView | utils | getAllAllowedHeaders', () => {
  it('should return a sorted array containing all the displayed fields', () => {
    const attributes = {
      addresse: {
        type: 'relation',
        relationType: 'morph',
      },
      test: {
        type: 'string',
      },
      first: {
        type: 'relation',
        relationType: 'manyToMany',
      },
    };

    expect(getAllAllowedHeaders(attributes)).toEqual(['first', 'test']);
  });
});
