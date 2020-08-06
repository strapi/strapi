import reducer from '../reducer';

describe('ADMIN | COMPONENTS | USERSPERMISSIONS | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const state = {
        test: true,
      };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('SELECT_ACTION', () => {
    it('should set the selected action correctly if this one doesnt exist', () => {
      const action = {
        type: 'SELECT_ACTION',
        actionToSelect: 'application.controllers.address.delete',
      };
      const initialState = {
        permissions: {},
        pluginName: '',
        routes: {},
        selectedAction: '',
        policies: [],
      };

      const expected = {
        permissions: {},
        pluginName: '',
        routes: {},
        selectedAction: 'application.controllers.address.delete',
        policies: [],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should empty the selected action if the action to select already exist', () => {
      const action = {
        type: 'SELECT_ACTION',
        actionToSelect: 'application.controllers.address.delete',
      };
      const initialState = {
        permissions: {},
        pluginName: '',
        routes: {},
        selectedAction: 'application.controllers.address.delete',
        policies: [],
      };

      const expected = {
        permissions: {},
        pluginName: '',
        routes: {},
        selectedAction: '',
        policies: [],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('SET_PLUGIN_NAME', () => {
    it('should set the plugin name correclty', () => {
      const action = {
        type: 'SET_PLUGIN_NAME',
        pluginName: 'content-manager',
      };
      const initialState = {
        permissions: {},
        pluginName: '',
        routes: {},
        selectedAction: '',
        policies: [],
      };

      const expected = {
        permissions: {},
        pluginName: 'content-manager',
        routes: {},
        selectedAction: '',
        policies: [],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('SELECT_POLICY', () => {
    it('should select the policy correctly in the permissions state', () => {
      const action = {
        type: 'SELECT_POLICY',
        policyName: 'custompolicy',
      };
      const initialState = {
        permissions: {
          application: {
            controllers: {
              address: {
                delete: {
                  policy: '',
                  enabled: false,
                },
                find: { enabled: false, policy: '' },
              },
            },
          },
        },
        pluginName: '',
        routes: {},
        selectedAction: 'application.controllers.address.delete',
        policies: ['custompolicy'],
      };

      const expected = {
        permissions: {
          application: {
            controllers: {
              address: {
                delete: {
                  policy: 'custompolicy',
                  enabled: false,
                },
                find: { enabled: false, policy: '' },
              },
            },
          },
        },
        pluginName: '',
        routes: {},
        selectedAction: 'application.controllers.address.delete',
        policies: ['custompolicy'],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('SELECT_PERMISSION', () => {
    it('should enable the permission correctly', () => {
      const action = {
        type: 'SELECT_PERMISSION',
        permissionToSelect: 'application.controllers.address.create',
      };
      const initialState = {
        permissions: {
          application: {
            controllers: {
              address: {
                create: {
                  enabled: false,
                  policy: '',
                },
                delete: {
                  policy: '',
                  enabled: false,
                },
                find: { enabled: false, policy: '' },
              },
            },
          },
        },
        pluginName: '',
        routes: {},
        selectedAction: '',
        policies: [],
      };

      const expected = {
        permissions: {
          application: {
            controllers: {
              address: {
                create: {
                  enabled: true,
                  policy: '',
                },
                delete: {
                  policy: '',
                  enabled: false,
                },
                find: {
                  enabled: false,
                  policy: '',
                },
              },
            },
          },
        },
        pluginName: '',
        routes: {},
        selectedAction: '',
        policies: [],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should disable the permission correctly', () => {
      const action = {
        type: 'SELECT_PERMISSION',
        permissionToSelect: 'application.controllers.address.create',
      };
      const initialState = {
        permissions: {
          application: {
            controllers: {
              address: {
                create: {
                  enabled: true,
                  policy: '',
                },
                delete: {
                  policy: '',
                  enabled: false,
                },
                find: { enabled: false, policy: '' },
              },
            },
          },
        },
        pluginName: '',
        routes: {},
        selectedAction: '',
        policies: [],
      };

      const expected = {
        permissions: {
          application: {
            controllers: {
              address: {
                create: {
                  enabled: false,
                  policy: '',
                },
                delete: {
                  policy: '',
                  enabled: false,
                },
                find: {
                  enabled: false,
                  policy: '',
                },
              },
            },
          },
        },
        pluginName: '',
        routes: {},
        selectedAction: '',
        policies: [],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('SELECT_SUBCATEGORY', () => {
    it('should enable all permissions of the subcategory', () => {
      const action = {
        type: 'SELECT_SUBCATEGORY',
        subcategoryPath: 'application.controllers.address',
        shouldEnable: true,
      };
      const initialState = {
        permissions: {
          application: {
            controllers: {
              address: {
                create: {
                  enabled: false,
                  policy: '',
                },
                delete: {
                  policy: '',
                  enabled: false,
                },
                find: { enabled: false, policy: '' },
              },
            },
          },
        },
        pluginName: '',
        routes: {},
        selectedAction: '',
        policies: [],
      };

      const expected = {
        permissions: {
          application: {
            controllers: {
              address: {
                create: {
                  enabled: true,
                  policy: '',
                },
                delete: {
                  policy: '',
                  enabled: true,
                },
                find: {
                  enabled: true,
                  policy: '',
                },
              },
            },
          },
        },
        pluginName: '',
        routes: {},
        selectedAction: '',
        policies: [],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should disable all permissions of the subcategory', () => {
      const action = {
        type: 'SELECT_SUBCATEGORY',
        subcategoryPath: 'application.controllers.address',
        shouldEnable: false,
      };
      const initialState = {
        permissions: {
          application: {
            controllers: {
              address: {
                create: {
                  enabled: true,
                  policy: '',
                },
                delete: {
                  policy: '',
                  enabled: true,
                },
                find: { enabled: true, policy: '' },
              },
            },
          },
        },
        pluginName: '',
        routes: {},
        selectedAction: '',
        policies: [],
      };

      const expected = {
        permissions: {
          application: {
            controllers: {
              address: {
                create: {
                  enabled: false,
                  policy: '',
                },
                delete: {
                  policy: '',
                  enabled: false,
                },
                find: {
                  enabled: false,
                  policy: '',
                },
              },
            },
          },
        },
        pluginName: '',
        routes: {},
        selectedAction: '',
        policies: [],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
