import reducer from '../reducer';
import { staticAttributeActions } from '../utils';

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
      };
      const initialState = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            conditions: {
              read: ['admin::is-creator'],
            },
            contentTypeActions: {
              'plugins::content-manager.explorer.create': true,
              'plugins::content-manager.explorer.read': true,
              'plugins::content-manager.explorer.update': true,
            },
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
              'plugins::content-manager.explorer.create': true,
              'plugins::content-manager.explorer.read': true,
              'plugins::content-manager.explorer.update': true,
            },
            attributes: {
              picture: {
                actions: staticAttributeActions,
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

    it('should set all static actions to an attribute permissions and add content type actions', () => {
      const action = {
        type: 'ALL_ATTRIBUTE_ACTIONS_SELECT',
        subject: 'place',
        attribute: { attributeName: 'picture', required: false },
      };
      const initialState = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            conditions: {
              read: ['admin::is-creator'],
            },
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
              'plugins::content-manager.explorer.create': true,
              'plugins::content-manager.explorer.read': true,
              'plugins::content-manager.explorer.update': true,
            },
            attributes: {
              picture: {
                actions: staticAttributeActions,
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

    it('should remove all actions if they are already in permissions', () => {
      const action = {
        type: 'ALL_ATTRIBUTE_ACTIONS_SELECT',
        subject: 'place',
        attribute: { attributeName: 'picture', required: false },
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
              'plugins::content-manager.explorer.create': true,
            },
            attributes: {
              picture: {
                actions: staticAttributeActions,
              },
              video: {
                actions: staticAttributeActions,
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
              'plugins::content-manager.explorer.create': true,
              'plugins::content-manager.explorer.delete': true,
              'plugins::content-manager.explorer.read': true,
              'plugins::content-manager.explorer.update': true,
            },
            attributes: {
              picture: {
                actions: [],
              },
              video: {
                actions: staticAttributeActions,
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
      };
      const initialState = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            conditions: {
              read: ['admin::is-creator'],
            },
            contentTypeActions: {
              'plugins::content-manager.explorer.create': true,
              'plugins::content-manager.explorer.delete': true,
              'plugins::content-manager.explorer.read': true,
              'plugins::content-manager.explorer.update': true,
            },
            attributes: {
              picture: {
                actions: staticAttributeActions,
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
              { action: 'plugins::content-manager.explorer.delete' },
              { action: 'plugins::content-manager.explorer.publish' },
            ],
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ALL_CONTENT_TYPE_PERMISSIONS_SELECT', () => {
    it('should add all the content type permissions without content type actions', () => {
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
        shouldSetAllContentTypes: false,
      };

      const initialState = {
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
        contentTypesPermissions: {
          place: {
            conditions: {
              read: ['admin::is-creator'],
            },
            contentTypeActions: {
              'plugins::content-manager.explorer.create': true,
              'plugins::content-manager.explorer.read': true,
              'plugins::content-manager.explorer.update': true,
            },
            attributes: {
              address: {
                actions: staticAttributeActions,
              },
              city: {
                actions: staticAttributeActions,
              },
              postal_code: {
                actions: staticAttributeActions,
              },
              'media.vote': {
                actions: staticAttributeActions,
              },
              'media.vote.like': {
                actions: staticAttributeActions,
              },
              'media.vote.long_description': {
                actions: staticAttributeActions,
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
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.delete' },
              { action: 'plugins::content-manager.explorer.publish' },
            ],
          },
        },
      };

      const initialState = {
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.create', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.read', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.update', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.delete', subjects: ['place'] },
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
            ],
          },
        },
        contentTypesPermissions: {
          place: {
            conditions: {
              read: ['admin::is-creator'],
            },
            contentTypeActions: {
              'plugins::content-manager.explorer.create': true,
              'plugins::content-manager.explorer.delete': true,
              'plugins::content-manager.explorer.read': true,
              'plugins::content-manager.explorer.update': true,
            },
            attributes: {
              address: {
                actions: staticAttributeActions,
              },
              city: {
                actions: staticAttributeActions,
              },
              postal_code: {
                actions: staticAttributeActions,
              },
              'media.vote': {
                actions: staticAttributeActions,
              },
              'media.vote.like': {
                actions: staticAttributeActions,
              },
              'media.vote.long_description': {
                actions: staticAttributeActions,
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
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.delete' },
              { action: 'plugins::content-manager.explorer.publish' },
            ],
          },
        },
      };

      const initialState = {
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.create', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.read', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.update', subjects: ['place'] },
              { action: 'plugins::content-manager.explorer.delete', subjects: ['place'] },
            ],
          },
        },
        contentTypesPermissions: {
          place: {
            contentTypeActions: {
              'plugins::content-manager.explorer.delete': true,
              'plugins::content-manager.explorer.read': true,
              'plugins::content-manager.explorer.create': true,
              'plugins::content-manager.explorer.update': true,
            },
            attributes: {
              address: {
                actions: staticAttributeActions,
              },
              city: {
                actions: staticAttributeActions,
              },
              postal_code: {
                actions: staticAttributeActions,
              },
              'media.vote': {
                actions: staticAttributeActions,
              },
              'media.vote.like': {
                actions: staticAttributeActions,
              },
              'media.vote.long_description': {
                actions: staticAttributeActions,
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
            ],
          },
        },
        contentTypesPermissions: {
          place: {
            contentTypeActions: {
              'plugins::content-manager.explorer.delete': false,
              'plugins::content-manager.explorer.read': false,
              'plugins::content-manager.explorer.update': false,
              'plugins::content-manager.explorer.create': false,
            },
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
});
