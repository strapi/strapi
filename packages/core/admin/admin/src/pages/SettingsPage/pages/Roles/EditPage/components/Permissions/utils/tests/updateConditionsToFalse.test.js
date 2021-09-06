import updateConditionsToFalse from '../updateConditionsToFalse';

describe('ADMIN | COMPONENTS | ROLE | PluginsAndSettings | updateConditionsToFalse', () => {
  it('should not mutate the object when it does not have a conditions key', () => {
    const data = {
      f1: 'test',
      f2: 'test',
    };

    expect(updateConditionsToFalse(data)).toEqual(data);
  });

  it('should mutate the conditions key when the properties leafs are falsy', () => {
    const modifiedData = {
      collectionTypes: {
        address: {
          create: {
            properties: {
              fields: {
                f1: false,
                f2: {
                  f21: { f22: false },
                },
              },
            },
            conditions: { creator: true, role: true },
          },
          read: {
            properties: {
              enabled: false,
            },
            conditions: { creator: true, role: true },
          },
        },
        test: {
          update: {
            properties: {
              locales: {
                f1: false,
                f2: {
                  f21: { f22: false },
                },
              },
            },
            conditions: { creator: true, role: true },
          },
          delete: {
            properties: {
              enabled: false,
            },
            conditions: { creator: true, role: true },
          },
        },
      },
    };

    const expected = {
      collectionTypes: {
        address: {
          create: {
            properties: {
              fields: {
                f1: false,
                f2: {
                  f21: { f22: false },
                },
              },
            },
            conditions: { creator: false, role: false },
          },
          read: {
            properties: {
              enabled: false,
            },
            conditions: { creator: false, role: false },
          },
        },
        test: {
          update: {
            properties: {
              locales: {
                f1: false,
                f2: {
                  f21: { f22: false },
                },
              },
            },
            conditions: { creator: false, role: false },
          },
          delete: {
            properties: {
              enabled: false,
            },
            conditions: { creator: false, role: false },
          },
        },
      },
    };

    expect(updateConditionsToFalse(modifiedData)).toEqual(expected);
  });

  it('should not mutate the conditions key when at least one of the properties leafs is truthy', () => {
    const modifiedData = {
      collectionTypes: {
        address: {
          create: {
            properties: {
              fields: {
                f1: false,
                f2: {
                  f21: { f211: false, f222: true },
                },
              },
            },
            conditions: { creator: true, role: false },
          },
          read: {
            properties: {
              enabled: false,
            },
            conditions: { creator: true, role: true },
          },
        },
        test: {
          update: {
            properties: {
              fields: { f1: true },
              locales: {
                f1: false,
                f2: {
                  f21: { f22: false },
                },
              },
            },
            conditions: { creator: true, role: true },
          },
          delete: {
            properties: {
              enabled: true,
            },
            conditions: { creator: false, role: 'false' },
          },
        },
      },
      plugins: { test: { properties: { create: false }, conditions: { creator: true } } },
    };

    const expected = {
      collectionTypes: {
        address: {
          create: {
            properties: {
              fields: {
                f1: false,
                f2: {
                  f21: { f211: false, f222: true },
                },
              },
            },
            conditions: { creator: true, role: false },
          },
          read: {
            properties: {
              enabled: false,
            },
            conditions: { creator: false, role: false },
          },
        },
        test: {
          update: {
            properties: {
              fields: { f1: true },
              locales: {
                f1: false,
                f2: {
                  f21: { f22: false },
                },
              },
            },
            conditions: { creator: true, role: true },
          },
          delete: {
            properties: {
              enabled: true,
            },
            conditions: { creator: false, role: 'false' },
          },
        },
      },
      plugins: { test: { properties: { create: false }, conditions: { creator: false } } },
    };

    expect(updateConditionsToFalse(modifiedData)).toEqual(expected);
  });
});
