import createArrayOfValues from '../createArrayOfValues';

describe('ADMIN | COMPONENTS | PERMISSIONS | ContentTypeCollapse | utils', () => {
  it('should return an array', () => {
    expect(createArrayOfValues({})).toEqual([]);
  });

  it('should return an array if argument is not object', () => {
    expect(createArrayOfValues(null)).toEqual([]);
    expect(createArrayOfValues('null')).toEqual([]);
  });

  it('should return an array with the leafs from the object', () => {
    const data = {
      collectionTypes: {
        address: {
          'content-manager.explorer.create': {
            properties: {
              fields: {
                postal_coder: 'un',
                categories: 'deux',
                cover: 'trois',
              },
            },
          },
        },
        restaurant: {
          'content-manager.explorer.create': {
            properties: {
              fields: {
                services: {
                  name: 'quatre',
                  media: 'cinq',
                  closing: {
                    name: {
                      test: 'six',
                    },
                  },
                },
                dz: 'sept',
              },
              locales: {
                fr: 'huit',
                en: 'neuf',
              },
            },
          },
        },
      },
    };
    const expected = ['un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];

    expect(
      createArrayOfValues({
        foo: 'true',
        bar: 'false',
      })
    ).toEqual(['true', 'false']);
    expect(createArrayOfValues(data)).toEqual(expected);
  });
});
