import reducer from '../reducer';

describe('ADMIN | COMPONENTS | Permissions | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState when the type is undefined', () => {
      const initialState = { ok: true };
      const action = { type: undefined };

      expect(reducer(initialState, action)).toEqual(initialState);
    });
  });
  describe('ON_CHANGE_COLLECTION_TYPE_GLOBAL_ACTION_CHECKBOX', () => {
    it('should set all the values in each content type corresponding to the correct action', () => {
      const initialState = {
        modifiedData: {
          collectionTypes: {
            address: {
              'content-manager.explorer.create': {
                fields: {
                  f1: true,
                },
              },
              'content-manager.explorer.update': {
                fields: {
                  f1: true,
                },
              },
            },
            restaurant: {
              'content-manager.explorer.create': {
                fields: {
                  f1: true,
                  f2: true,
                  services: {
                    name: true,
                    media: true,
                    closing: {
                      name: {
                        test: true,
                      },
                    },
                  },
                  dz: true,
                  relation: true,
                },
                locales: {
                  fr: true,
                  en: true,
                },
                conditions: {
                  test: true,
                },
              },
            },
          },
        },
        singleTypes: {
          test: {
            'content-manager.explorer.create': {
              fields: { f1: true },
            },
          },
        },
      };

      const expected = {
        modifiedData: {
          collectionTypes: {
            address: {
              'content-manager.explorer.create': {
                fields: {
                  f1: false,
                },
              },
              'content-manager.explorer.update': {
                fields: {
                  f1: true,
                },
              },
            },
            restaurant: {
              'content-manager.explorer.create': {
                fields: {
                  f1: false,
                  f2: false,
                  services: {
                    name: false,
                    media: false,
                    closing: {
                      name: {
                        test: false,
                      },
                    },
                  },
                  dz: false,
                  relation: false,
                },
                locales: {
                  fr: false,
                  en: false,
                },
                conditions: {
                  test: true,
                },
              },
            },
          },
        },
        singleTypes: {
          test: {
            'content-manager.explorer.create': {
              fields: { f1: true },
            },
          },
        },
      };
      const action = {
        type: 'ON_CHANGE_COLLECTION_TYPE_GLOBAL_ACTION_CHECKBOX',
        collectionTypeKind: 'collectionTypes',
        actionId: 'content-manager.explorer.create',
        value: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE_SIMPLE_CHECKBOX', () => {
    it('should set the modifiedData with the correct value', () => {
      const action = {
        type: 'ON_CHANGE_SIMPLE_CHECKBOX',
        keys: 'test..enabled',
        value: false,
      };

      const initialState = {
        initialData: { test: { enabled: true } },
        modifiedData: { test: { enabled: true } },
      };
      const expected = {
        initialData: { test: { enabled: true } },
        modifiedData: { test: { enabled: false } },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE_TOGGLE_PARENT_CHECKBOX', () => {
    it('should set all the deepest values of the create action to true', () => {
      const action = {
        type: 'ON_CHANGE_TOGGLE_PARENT_CHECKBOX',
        keys: 'restaurant..create',
        value: true,
      };

      const initialState = {
        initialData: {},
        modifiedData: {
          restaurant: {
            create: {
              fields: { f1: false, f2: { f1: false } },
              locales: { en: false },
              conditions: {
                test: 'test',
              },
            },
            update: {
              test: true,
            },
          },
        },
      };

      const expected = {
        initialData: {},
        modifiedData: {
          restaurant: {
            create: {
              fields: { f1: true, f2: { f1: true } },
              locales: { en: true },
              conditions: {
                test: 'test',
              },
            },
            update: {
              test: true,
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
