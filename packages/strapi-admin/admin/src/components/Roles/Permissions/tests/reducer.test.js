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
    it('should set all the leafs in each content type corresponding to the correct action and remove the applied conditions when the value is falsy', () => {
      const initialState = {
        modifiedData: {
          collectionTypes: {
            address: {
              'content-manager.explorer.create': {
                properties: {
                  fields: {
                    f1: true,
                  },
                },
              },
              'content-manager.explorer.update': {
                properties: {
                  fields: {
                    f1: true,
                  },
                },
              },
            },
            restaurant: {
              'content-manager.explorer.create': {
                properties: {
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
              properties: {
                fields: { f1: true },
              },
            },
          },
        },
      };

      const expected = {
        modifiedData: {
          collectionTypes: {
            address: {
              'content-manager.explorer.create': {
                properties: {
                  fields: {
                    f1: false,
                  },
                },
              },
              'content-manager.explorer.update': {
                properties: {
                  fields: {
                    f1: true,
                  },
                },
              },
            },
            restaurant: {
              'content-manager.explorer.create': {
                properties: {
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
                },
                conditions: {
                  test: false,
                },
              },
            },
          },
        },
        singleTypes: {
          test: {
            'content-manager.explorer.create': {
              properties: {
                fields: { f1: true },
              },
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

    it('should set all the leafs in each content type corresponding to the correct action and remove the applied conditions when the value is truthy', () => {
      const initialState = {
        modifiedData: {
          collectionTypes: {
            address: {
              'content-manager.explorer.create': {
                properties: {
                  fields: {
                    f1: false,
                  },
                },
                conditions: {
                  creator: false,
                  roles: true,
                },
              },
              'content-manager.explorer.update': {
                properties: {
                  fields: {
                    f1: true,
                  },
                },
              },
            },
            restaurant: {
              'content-manager.explorer.create': {
                properties: {
                  fields: {
                    f1: true,
                    f2: true,
                  },
                  locales: {
                    fr: false,
                    en: false,
                  },
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
              properties: {
                fields: { f1: false },
              },
            },
          },
        },
      };

      const expected = {
        modifiedData: {
          collectionTypes: {
            address: {
              'content-manager.explorer.create': {
                properties: {
                  fields: {
                    f1: true,
                  },
                },
                conditions: {
                  creator: false,
                  roles: true,
                },
              },
              'content-manager.explorer.update': {
                properties: {
                  fields: {
                    f1: true,
                  },
                },
              },
            },
            restaurant: {
              'content-manager.explorer.create': {
                properties: {
                  fields: {
                    f1: true,
                    f2: true,
                  },
                  locales: {
                    fr: true,
                    en: true,
                  },
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
              properties: {
                fields: { f1: false },
              },
            },
          },
        },
      };
      const action = {
        type: 'ON_CHANGE_COLLECTION_TYPE_GLOBAL_ACTION_CHECKBOX',
        collectionTypeKind: 'collectionTypes',
        actionId: 'content-manager.explorer.create',
        value: true,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE_COLLECTION_TYPE_ROW_LEFT_CHECKBOX', () => {
    it('should set all the leafs of a content type property to true when the value is truthy and not remove the applied conditions', () => {
      const action = {
        pathToCollectionType: 'collectionTypes..address',
        propertyName: 'fields',
        rowName: 'f2',
        type: 'ON_CHANGE_COLLECTION_TYPE_ROW_LEFT_CHECKBOX',
        value: true,
      };
      const initialState = {
        initialData: { ok: true },
        modifiedData: {
          collectionTypes: {
            address: {
              create: {
                properties: {
                  fields: {
                    f1: true,
                    f2: false,
                  },
                },
                conditions: {
                  creator: false,
                  roles: true,
                },
              },
              read: {
                properties: {
                  fields: {
                    f1: false,
                    f2: false,
                  },
                },
                conditions: {
                  creator: false,
                  roles: false,
                },
              },
            },
            restaurant: {
              delete: {
                properties: {
                  enabled: true,
                },
                conditions: {
                  creator: false,
                  roles: true,
                },
              },
            },
          },
          plugins: { ok: true },
        },
      };

      const expected = {
        initialData: { ok: true },
        modifiedData: {
          collectionTypes: {
            address: {
              create: {
                properties: {
                  fields: {
                    f1: true,
                    f2: true,
                  },
                },
                conditions: {
                  creator: false,
                  roles: true,
                },
              },
              read: {
                properties: {
                  fields: {
                    f1: false,
                    f2: true,
                  },
                },
                conditions: {
                  creator: false,
                  roles: false,
                },
              },
            },
            restaurant: {
              delete: {
                properties: {
                  enabled: true,
                },
                conditions: {
                  creator: false,
                  roles: true,
                },
              },
            },
          },
          plugins: { ok: true },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should set all the leafs of a content type property to false when the value is falsy and remove the applied conditions', () => {
      const action = {
        pathToCollectionType: 'collectionTypes..address',
        propertyName: 'fields',
        rowName: 'f1',
        type: 'ON_CHANGE_COLLECTION_TYPE_ROW_LEFT_CHECKBOX',
        value: false,
      };
      const initialState = {
        initialData: { ok: true },
        modifiedData: {
          collectionTypes: {
            address: {
              create: {
                properties: {
                  fields: {
                    f1: true,
                    f2: false,
                  },
                },
                conditions: {
                  creator: false,
                  roles: true,
                },
              },
              read: {
                properties: {
                  fields: {
                    f1: false,
                    f2: false,
                  },
                },
                conditions: {
                  creator: false,
                  roles: false,
                },
              },
            },
            restaurant: {
              delete: {
                properties: {
                  enabled: true,
                },
                conditions: {
                  creator: false,
                  roles: true,
                },
              },
            },
          },
          plugins: { ok: true },
        },
      };

      const expected = {
        initialData: { ok: true },
        modifiedData: {
          collectionTypes: {
            address: {
              create: {
                properties: {
                  fields: {
                    f1: false,
                    f2: false,
                  },
                },
                conditions: {
                  creator: false,
                  roles: false,
                },
              },
              read: {
                properties: {
                  fields: {
                    f1: false,
                    f2: false,
                  },
                },
                conditions: {
                  creator: false,
                  roles: false,
                },
              },
            },
            restaurant: {
              delete: {
                properties: {
                  enabled: true,
                },
                conditions: {
                  creator: false,
                  roles: true,
                },
              },
            },
          },
          plugins: { ok: true },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE_CONDITIONS', () => {
    it('should apply the conditions only to the correct actions', () => {
      const initialState = {
        initialData: { ok: true },
        layouts: { foo: 'bar' },
        modifiedData: {
          collectionTypes: {
            address: {
              create: {
                properties: {
                  fields: {
                    f1: true,
                    f2: false,
                  },
                },
                conditions: {
                  creator: false,
                  roles: true,
                },
              },
              read: {
                properties: {
                  fields: {
                    f1: true,
                    f2: false,
                  },
                },
                conditions: {
                  creator: true,
                  roles: false,
                },
              },
            },
          },
          plugins: {
            ctb: {
              general: {
                read: {
                  properties: {
                    enabled: false,
                  },
                  conditions: {
                    creator: false,
                    roles: false,
                  },
                },
              },
            },
            doc: {
              general: {
                read: {
                  properties: {
                    enabled: true,
                  },
                  conditions: {
                    creator: false,
                    roles: false,
                  },
                },
              },
              settings: {
                read: {
                  properties: {
                    enabled: false,
                  },
                  conditions: {
                    creator: false,
                    roles: false,
                  },
                },
                updated: {
                  properties: {
                    enabled: true,
                  },
                  conditions: {
                    creator: false,
                    roles: false,
                  },
                },
              },
            },
          },
        },
      };

      const conditions = {
        'collectionTypes..address..create': {
          creator: true,
          roles: false,
        },
        'collectionTypes..address..read': {
          creator: false,
          roles: false,
        },
        'plugins..doc..settings..updated': {
          creator: true,
          roles: true,
        },
      };

      const expected = {
        initialData: { ok: true },
        layouts: { foo: 'bar' },
        modifiedData: {
          collectionTypes: {
            address: {
              create: {
                properties: {
                  fields: {
                    f1: true,
                    f2: false,
                  },
                },
                conditions: {
                  creator: true,
                  roles: false,
                },
              },
              read: {
                properties: {
                  fields: {
                    f1: true,
                    f2: false,
                  },
                },
                conditions: {
                  creator: false,
                  roles: false,
                },
              },
            },
          },
          plugins: {
            ctb: {
              general: {
                read: {
                  properties: {
                    enabled: false,
                  },
                  conditions: {
                    creator: false,
                    roles: false,
                  },
                },
              },
            },
            doc: {
              general: {
                read: {
                  properties: {
                    enabled: true,
                  },
                  conditions: {
                    creator: false,
                    roles: false,
                  },
                },
              },
              settings: {
                read: {
                  properties: {
                    enabled: false,
                  },
                  conditions: {
                    creator: false,
                    roles: false,
                  },
                },
                updated: {
                  properties: {
                    enabled: true,
                  },
                  conditions: {
                    creator: true,
                    roles: true,
                  },
                },
              },
            },
          },
        },
      };

      const action = { type: 'ON_CHANGE_CONDITIONS', conditions };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE_SIMPLE_CHECKBOX', () => {
    it('should set the modifiedData.test.enabled to false when the value is falsy and remove the applied conditions', () => {
      const action = {
        type: 'ON_CHANGE_SIMPLE_CHECKBOX',
        keys: 'test..properties..enabled',
        value: false,
      };

      const initialState = {
        initialData: {
          test: { properties: { enabled: true }, conditions: { creator: true, roles: true } },
        },
        modifiedData: {
          test: { properties: { enabled: true }, conditions: { creator: true, roles: true } },
        },
      };
      const expected = {
        initialData: {
          test: { properties: { enabled: true }, conditions: { creator: true, roles: true } },
        },
        modifiedData: {
          test: { properties: { enabled: false }, conditions: { creator: false, roles: false } },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should set the modifiedData.test.enabled to true when the value is truthy and not remove the applied conditions', () => {
      const action = {
        type: 'ON_CHANGE_SIMPLE_CHECKBOX',
        keys: 'test..properties..enabled',
        value: true,
      };

      const initialState = {
        initialData: {
          test: { properties: { enabled: false }, conditions: { creator: true, roles: true } },
        },
        modifiedData: {
          test: { properties: { enabled: false }, conditions: { creator: true, roles: true } },
        },
      };
      const expected = {
        initialData: {
          test: { properties: { enabled: false }, conditions: { creator: true, roles: true } },
        },
        modifiedData: {
          test: { properties: { enabled: true }, conditions: { creator: true, roles: true } },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE_TOGGLE_PARENT_CHECKBOX', () => {
    it('should set all the leafs of the create action to true and not remove the applied conditions when the value is truthy', () => {
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
              properties: {
                fields: { f1: false, f2: { f1: false } },
                locales: { en: false },
              },
              conditions: {
                test: 'test',
              },
            },
            update: {
              properties: {
                test: true,
              },
            },
          },
        },
      };

      const expected = {
        initialData: {},
        modifiedData: {
          restaurant: {
            create: {
              properties: {
                fields: { f1: true, f2: { f1: true } },
                locales: { en: true },
              },
              conditions: {
                test: 'test',
              },
            },
            update: {
              properties: {
                test: true,
              },
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should set all the leafs of the create action to true and remove the applied conditions when the value is falsy', () => {
      const action = {
        type: 'ON_CHANGE_TOGGLE_PARENT_CHECKBOX',
        keys: 'restaurant..create',
        value: false,
      };

      const initialState = {
        initialData: {},
        modifiedData: {
          restaurant: {
            create: {
              properties: {
                fields: { f1: true, f2: { f1: false } },
                locales: { en: false },
              },
              conditions: {
                test: true,
              },
            },
            update: {
              properties: {
                test: true,
              },
            },
          },
        },
      };

      const expected = {
        initialData: {},
        modifiedData: {
          restaurant: {
            create: {
              properties: {
                fields: { f1: false, f2: { f1: false } },
                locales: { en: false },
              },
              conditions: {
                test: false,
              },
            },
            update: {
              properties: {
                test: true,
              },
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
