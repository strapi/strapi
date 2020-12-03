import reducer from '../reducer';
import { STATIC_ATTRIBUTE_ACTIONS } from '../utils';

describe('ADMIN | COMPONENTS | Permissions | ContentTypes | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const state = {
        test: true,
      };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('COLLAPSE_PATH', () => {
    it('should add the first level of the path', () => {
      const action = {
        type: 'COLLAPSE_PATH',
        index: 0,
        value: 'address',
      };
      const initialState = {
        collapsePath: [],
      };
      const expected = {
        collapsePath: ['address'],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should remove the value from the level level if click on the same value and level', () => {
      const action = {
        type: 'COLLAPSE_PATH',
        index: 0,
        value: 'address',
      };
      const initialState = {
        collapsePath: ['address'],
      };
      const expected = {
        collapsePath: [],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should add another level to the path', () => {
      const action = {
        type: 'COLLAPSE_PATH',
        index: 1,
        value: 'city',
      };
      const initialState = {
        collapsePath: ['address'],
      };
      const expected = {
        collapsePath: ['address', 'city'],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should replace the value at the right level', () => {
      const action = {
        type: 'COLLAPSE_PATH',
        index: 2,
        value: 'floor',
      };
      const initialState = {
        collapsePath: ['address', 'city', 'number', 'door'],
      };
      const expected = {
        collapsePath: ['address', 'city', 'floor'],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should remove all values from the index if same values and index', () => {
      const action = {
        type: 'COLLAPSE_PATH',
        index: 1,
        value: 'city',
      };
      const initialState = {
        collapsePath: ['address', 'city', 'number', 'door'],
      };
      const expected = {
        collapsePath: ['address'],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ALL_ATTRIBUTE_ACTIONS_SELECT', () => {
    it('should set all static actions to an attribute permissions', () => {
      const action = {
        type: 'ALL_ATTRIBUTE_ACTIONS_SELECT',
        subject: 'place',
        attribute: { attributeName: 'picture', required: false },
        shouldEnable: true,
      };
      const initialState = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            conditions: {
              read: ['admin::is-creator'],
            },
            contentTypeActions: {},
            attributes: {
              picture: {
                actions: [],
              },
            },
          },
        },
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.delete', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.publish', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.create', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.read', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.update', subjects: ['place'] },
            ],
          },
        },
      };
      const expected = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            conditions: {
              read: ['admin::is-creator'],
            },
            contentTypeActions: {
              'plugins::content-manager.explorer.delete': true,
              'plugins::content-manager.explorer.publish': true,
            },
            attributes: {
              picture: {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
            },
          },
        },
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.delete', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.publish', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.create', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.read', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.update', subjects: ['place'] },
            ],
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should remove all actions if they are already in permissions', () => {
      const action = {
        type: 'ALL_ATTRIBUTE_ACTIONS_SELECT',
        subject: 'place',
        attribute: { attributeName: 'picture', required: false },
        shouldEnable: false,
      };
      const initialState = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            conditions: {
              read: ['admin::is-creator'],
            },
            contentTypeActions: {
              'plugins::content-manager.explorer.delete': true,
            },
            attributes: {
              picture: {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
              video: {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
              name: {
                actions: ['plugins::content-manager.explorer.create'],
              },
            },
          },
        },
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.delete' },
              { action: 'plugins::content-manager.explorer.publish' },
            ],
          },
        },
      };
      const expected = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            conditions: {
              read: ['admin::is-creator'],
            },
            contentTypeActions: {
              'plugins::content-manager.explorer.delete': true,
            },
            attributes: {
              picture: {
                actions: [],
              },
              video: {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
              name: {
                actions: ['plugins::content-manager.explorer.create'],
              },
            },
          },
        },
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.delete' },
              { action: 'plugins::content-manager.explorer.publish' },
            ],
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should remove all actions if they are already in permissions and remove content type actions', () => {
      const action = {
        type: 'ALL_ATTRIBUTE_ACTIONS_SELECT',
        subject: 'place',
        attribute: { attributeName: 'picture', required: false },
        shouldEnable: false,
      };
      const initialState = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            conditions: {
              read: ['admin::is-creator'],
            },
            contentTypeActions: {
              'plugins::content-manager.explorer.delete': true,
            },
            attributes: {
              picture: {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
              video: {
                actions: [],
              },
              name: {
                actions: [],
              },
            },
          },
        },
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.delete', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.publish', subjects: ['place'] },
            ],
          },
        },
      };
      const expected = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            conditions: {
              read: ['admin::is-creator'],
            },
            contentTypeActions: {},
            attributes: {
              picture: {
                actions: [],
              },
              video: {
                actions: [],
              },
              name: {
                actions: [],
              },
            },
          },
        },
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.delete', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.publish', subjects: ['place'] },
            ],
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ALL_CONTENT_TYPE_PERMISSIONS_SELECT', () => {
    it('should add all the content type permissions with content type actions', () => {
      const action = {
        type: 'ALL_CONTENT_TYPE_PERMISSIONS_SELECT',
        subject: 'place',
        attributes: [
          { attributeName: 'address', required: false },
          { attributeName: 'city', required: false },
          { attributeName: 'postal_code', required: false },
          { attributeName: 'media.vote', required: false },
          { attributeName: 'media.vote.like', required: false },
          { attributeName: 'media.vote.long_description', required: false },
        ],
        shouldEnable: true,
        shouldSetAllContentTypes: true,
      };

      const initialState = {
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.create', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.read', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.update', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.delete', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.publish', subjects: ['place'] },
            ],
          },
        },
        contentTypesPermissions: {
          place: {
            conditions: {
              read: ['admin::is-creator'],
            },
            attributes: {
              address: {
                actions: ['read'],
              },
              city: {
                actions: ['read'],
              },
              postal_code: {
                actions: ['read'],
              },
              'media.vote': {
                actions: [],
              },
              'media.vote.like': {
                actions: [],
              },
              'media.vote.long_description': {
                actions: [],
              },
            },
          },
        },
      };

      const expected = {
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.create', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.read', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.update', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.delete', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.publish', subjects: ['place'] },
            ],
          },
        },
        contentTypesPermissions: {
          place: {
            conditions: {
              read: ['admin::is-creator'],
            },
            contentTypeActions: {
              'plugins::content-manager.explorer.delete': true,
              'plugins::content-manager.explorer.publish': true,
            },
            attributes: {
              address: {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
              city: {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
              postal_code: {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
              'media.vote': {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
              'media.vote.like': {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
              'media.vote.long_description': {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should remove all the content type permissions', () => {
      const action = {
        type: 'ALL_CONTENT_TYPE_PERMISSIONS_SELECT',
        subject: 'place',
        attributes: [
          { attributeName: 'address', required: false },
          { attributeName: 'city', required: false },
          { attributeName: 'postal_code', required: false },
          { attributeName: 'media.vote', required: false },
          { attributeName: 'media.vote.like', required: false },
          { attributeName: 'media.vote.long_description', required: false },
        ],
        shouldEnable: false,
        shouldSetAllContentTypes: true,
      };

      const initialState = {
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.delete', subjects: ['place'] },
            ],
          },
        },
        contentTypesPermissions: {
          place: {
            contentTypeActions: {
              'plugins::content-manager.explorer.delete': true,
            },
            attributes: {
              address: {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
              city: {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
              postal_code: {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
              'media.vote': {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
              'media.vote.like': {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
              'media.vote.long_description': {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
            },
          },
        },
      };

      const expected = {
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.delete', subjects: ['place'] },
            ],
          },
        },
        contentTypesPermissions: {
          place: {
            contentTypeActions: {},
            attributes: {
              address: {
                actions: [],
              },
              city: {
                actions: [],
              },
              postal_code: {
                actions: [],
              },
              'media.vote': {
                actions: [],
              },
              'media.vote.like': {
                actions: [],
              },
              'media.vote.long_description': {
                actions: [],
              },
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('SELECT_MULTIPLE_ATTRIBUTE', () => {
    it('should select an action of an array of attributes in a content type', () => {
      const action = {
        type: 'SELECT_MULTIPLE_ATTRIBUTE',
        attributes: [
          { attributeName: 'city.componentfield1' },
          { attributeName: 'postal_code' },
          { attributeName: 'city.componentfield2.field' },
        ],
        subject: 'test',
      };
      const initialState = {
        contentTypesPermissions: {
          test: {
            attributes: {},
          },
          test2: {
            attributes: {
              postal_code: {
                actions: [
                  'plugins::content-manager.explorer.create',
                  'plugins::content-manager.explorer.read',
                ],
              },
            },
          },
        },
      };
      const expected = {
        contentTypesPermissions: {
          test: {
            attributes: {
              'city.componentfield1': {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
              'city.componentfield2.field': {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
              postal_code: {
                actions: STATIC_ATTRIBUTE_ACTIONS,
              },
            },
          },
          test2: {
            attributes: {
              postal_code: {
                actions: [
                  'plugins::content-manager.explorer.create',
                  'plugins::content-manager.explorer.read',
                ],
              },
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
