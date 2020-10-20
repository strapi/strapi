import reducer from '../reducer';
import { staticAttributeActions } from '../../../../../../admin/src/components/Roles/Permissions/utils';

describe('ADMIN | COMPONENTS | Permissions | ContentTypes | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const state = {
        test: true,
      };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('SELECT_ACTION', () => {
    it('should select a single action properly', () => {
      const action = {
        type: 'SELECT_ACTION',
        attribute: 'city',
        subject: 'test',
        action: 'create',
      };
      const initialState = {
        contentTypesPermissions: {
          test: {
            attributes: {},
          },
          test2: {
            attributes: {
              postal_code: {
                actions: ['create', 'read'],
              },
            },
          },
        },
      };
      const expected = {
        contentTypesPermissions: {
          test: {
            attributes: {
              city: {
                actions: ['create'],
              },
            },
          },
          test2: {
            attributes: {
              postal_code: {
                actions: ['create', 'read'],
              },
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should unselect a single action properly', () => {
      const action = {
        type: 'SELECT_ACTION',
        attribute: 'city',
        subject: 'test',
        action: 'create',
      };
      const initialState = {
        contentTypesPermissions: {
          test: {
            attributes: {
              city: {
                actions: ['create'],
              },
            },
          },
          test2: {
            attributes: {
              postal_code: {
                actions: ['create', 'read'],
              },
            },
          },
        },
      };
      const expected = {
        contentTypesPermissions: {
          test: {
            attributes: {
              city: {
                actions: [],
              },
            },
          },
          test2: {
            attributes: {
              postal_code: {
                actions: ['create', 'read'],
              },
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('SELECT_MULTIPLE_ATTRIBUTE', () => {
    it('should select an action of an array of attributes', () => {
      const action = {
        type: 'SELECT_MULTIPLE_ATTRIBUTE',
        attributes: [
          { attributeName: 'city.componentfield1' },
          { attributeName: 'postal_code' },
          { attributeName: 'city.componentfield2.field' },
        ],
        subject: 'test',
        action: 'create',
        shouldEnable: true,
      };
      const initialState = {
        contentTypesPermissions: {
          test: {
            attributes: {},
          },
          test2: {
            attributes: {
              postal_code: {
                actions: ['create', 'read'],
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
                actions: ['create'],
              },
              'city.componentfield2.field': {
                actions: ['create'],
              },
              postal_code: {
                actions: ['create'],
              },
            },
          },
          test2: {
            attributes: {
              postal_code: {
                actions: ['create', 'read'],
              },
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should unselect an action of an array of attributes', () => {
      const action = {
        type: 'SELECT_MULTIPLE_ATTRIBUTE',
        attributes: [
          { attributeName: 'city.componentfield1' },
          { attributeName: 'postal_code' },
          { attributeName: 'city.componentfield2.field' },
        ],
        subject: 'test',
        action: 'create',
        shouldEnable: false,
      };
      const initialState = {
        contentTypesPermissions: {
          test: {
            attributes: {
              'city.componentfield1': {
                actions: ['create', 'read'],
              },
              'city.componentfield2.field': {
                actions: ['create'],
              },
              postal_code: {
                actions: ['create', 'read'],
              },
            },
          },
          test2: {
            attributes: {
              postal_code: {
                actions: ['create', 'read'],
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
                actions: ['read'],
              },
              'city.componentfield2.field': {
                actions: [],
              },
              postal_code: {
                actions: ['read'],
              },
            },
          },
          test2: {
            attributes: {
              postal_code: {
                actions: ['create', 'read'],
              },
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
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

  describe('SET_ATTRIBUTES_PERMISSIONS', () => {
    it('should set attributes permissions correctly', () => {
      const action = {
        type: 'SET_ATTRIBUTES_PERMISSIONS',
        attributes: [
          { attributeName: 'address.city', contentTypeUid: 'place' },
          { attributeName: 'address.street', contentTypeUid: 'place' },
          { attributeName: 'picture', contentTypeUid: 'place' },
          { attributeName: 'number', contentTypeUid: 'like' },
        ],
        action: 'create',
        shouldEnable: true,
      };
      const initialState = {
        collapsePath: [],
        contentTypesPermissions: {},
      };
      const expected = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            attributes: {
              'address.city': {
                actions: ['create'],
              },
              'address.street': {
                actions: ['create'],
              },
              picture: {
                actions: ['create'],
              },
            },
          },
          like: {
            attributes: {
              number: {
                actions: ['create'],
              },
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should unset attributes permissions correctly', () => {
      const action = {
        type: 'SET_ATTRIBUTES_PERMISSIONS',
        attributes: [
          { attributeName: 'address.city', contentTypeUid: 'place' },
          { attributeName: 'address.street', contentTypeUid: 'place' },
          { attributeName: 'picture', contentTypeUid: 'place' },
          { attributeName: 'number', contentTypeUid: 'like' },
        ],
        action: 'create',
        shouldEnable: false,
      };
      const initialState = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            attributes: {
              'address.city': {
                actions: ['create'],
              },
              'address.street': {
                actions: ['create'],
              },
              picture: {
                actions: ['create'],
              },
            },
          },
          like: {
            attributes: {
              number: {
                actions: ['create'],
              },
            },
          },
        },
      };
      const expected = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            attributes: {
              'address.city': {
                actions: [],
              },
              'address.street': {
                actions: [],
              },
              picture: {
                actions: [],
              },
            },
          },
          like: {
            attributes: {
              number: {
                actions: [],
              },
            },
          },
        },
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
              'plugins::content-manager.explorer.delete': true,
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
              'plugins::content-manager.explorer.delete': true,
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

  describe('ATTRIBUTE_PERMISSION_SELECT', () => {
    it('should set a single attribute permission', () => {
      const action = {
        type: 'ATTRIBUTE_PERMISSION_SELECT',
        subject: 'place',
        attribute: 'video',
        action: 'create',
      };
      const initialState = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            contentTypeActions: {
              delete: true,
              create: true,
            },
            attributes: {
              picture: {
                actions: ['create'],
              },
            },
          },
        },
      };
      const expected = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            contentTypeActions: {
              delete: true,
              create: true,
            },
            attributes: {
              picture: {
                actions: ['create'],
              },
              video: {
                actions: ['create'],
              },
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should set a single attribute permission and add the content type action', () => {
      const action = {
        type: 'ATTRIBUTE_PERMISSION_SELECT',
        subject: 'place',
        attribute: 'picture',
        action: 'create',
      };
      const initialState = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            attributes: {
              picture: {
                actions: ['read'],
              },
            },
          },
        },
      };
      const expected = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            contentTypeActions: {
              delete: true,
              create: true,
            },
            attributes: {
              picture: {
                actions: ['read', 'create'],
              },
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should remove a single attribute permission', () => {
      const action = {
        type: 'ATTRIBUTE_PERMISSION_SELECT',
        subject: 'place',
        attribute: 'picture',
        action: 'read',
      };
      const initialState = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            attributes: {
              picture: {
                actions: ['read'],
              },
            },
          },
          country: {
            contentTypeActions: {
              delete: true,
            },
            attributes: {
              flag: {
                actions: ['read', 'update'],
              },
              description: {
                actions: ['read', 'create'],
              },
            },
          },
        },
      };
      const expected = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            attributes: {
              picture: {
                actions: [],
              },
            },
          },
          country: {
            contentTypeActions: {
              delete: true,
            },
            attributes: {
              flag: {
                actions: ['read', 'update'],
              },
              description: {
                actions: ['read', 'create'],
              },
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should remove a single attribute permission and also remove the content type action if it the last attribute to remove', () => {
      const action = {
        type: 'ATTRIBUTE_PERMISSION_SELECT',
        subject: 'place',
        attribute: 'picture',
        action: 'read',
      };
      const initialState = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            contentTypeActions: {
              delete: true,
              read: true,
            },
            attributes: {
              picture: {
                actions: ['read'],
              },
            },
          },
          country: {
            contentTypeActions: {
              delete: true,
            },
            attributes: {
              flag: {
                actions: ['read', 'update'],
              },
              description: {
                actions: ['read', 'create'],
              },
            },
          },
        },
      };
      const expected = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            contentTypeActions: {
              delete: true,
              read: false,
            },
            attributes: {
              picture: {
                actions: [],
              },
            },
          },
          country: {
            contentTypeActions: {
              delete: true,
            },
            attributes: {
              flag: {
                actions: ['read', 'update'],
              },
              description: {
                actions: ['read', 'create'],
              },
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('CONTENT_TYPE_ACTION_SELECT', () => {
    it('should set a content type action', () => {
      const action = {
        type: 'CONTENT_TYPE_ACTION_SELECT',
        subject: 'place',
        action: 'delete',
      };
      const initialState = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            attributes: {
              postal_code: {
                actions: ['create'],
              },
              picture: {
                actions: ['read'],
              },
            },
          },
        },
      };
      const expected = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            attributes: {
              postal_code: {
                actions: ['create'],
              },
              picture: {
                actions: ['read'],
              },
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should set the content type action to false', () => {
      const action = {
        type: 'CONTENT_TYPE_ACTION_SELECT',
        subject: 'place',
        action: 'delete',
      };
      const initialState = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            attributes: {
              postal_code: {
                actions: ['create'],
              },
              picture: {
                actions: ['read'],
              },
            },
          },
        },
      };
      const expected = {
        collapsePath: [],
        contentTypesPermissions: {
          place: {
            contentTypeActions: {
              delete: false,
            },
            attributes: {
              postal_code: {
                actions: ['create'],
              },
              picture: {
                actions: ['read'],
              },
            },
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
              'plugins::content-manager.explorer.delete': true,
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

  describe('GLOBAL_PERMISSIONS_SELECT', () => {
    it('should set the content type action to all the content types', () => {
      const action = {
        type: 'GLOBAL_PERMISSIONS_SELECT',
        action: 'delete',
        contentTypes: [{ uid: 'places' }, { uid: 'addresses' }, { uid: 'restaurants' }],
        shouldEnable: true,
      };
      const initialState = {
        contentTypesPermissions: {
          places: {
            attributes: {
              image: {
                actions: ['create'],
              },
            },
            contentTypeActions: {
              create: true,
            },
          },
          addresses: {
            contentTypeActions: {
              create: true,
            },
            attributes: {
              image: {
                actions: ['create'],
              },
            },
          },
        },
      };
      const expected = {
        contentTypesPermissions: {
          places: {
            attributes: {
              image: {
                actions: ['create'],
              },
            },
            contentTypeActions: {
              create: true,
              delete: true,
            },
          },
          addresses: {
            contentTypeActions: {
              create: true,
              delete: true,
            },
            attributes: {
              image: {
                actions: ['create'],
              },
            },
          },
          restaurants: {
            contentTypeActions: {
              delete: true,
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should unset the content type action to all the content types', () => {
      const action = {
        type: 'GLOBAL_PERMISSIONS_SELECT',
        action: 'delete',
        contentTypes: [{ uid: 'places' }, { uid: 'addresses' }, { uid: 'restaurants' }],
        shouldEnable: false,
      };
      const initialState = {
        contentTypesPermissions: {
          places: {
            attributes: {
              image: {
                actions: ['create'],
              },
            },
            contentTypeActions: {
              create: true,
              delete: true,
            },
          },
          addresses: {
            contentTypeActions: {
              create: true,
              delete: true,
            },
            attributes: {
              image: {
                actions: ['create'],
              },
            },
          },
          restaurants: {
            contentTypeActions: {
              delete: true,
            },
          },
        },
      };
      const expected = {
        contentTypesPermissions: {
          places: {
            attributes: {
              image: {
                actions: ['create'],
              },
            },
            contentTypeActions: {
              create: true,
              delete: false,
            },
          },
          addresses: {
            contentTypeActions: {
              create: true,
              delete: false,
            },
            attributes: {
              image: {
                actions: ['create'],
              },
            },
          },
          restaurants: {
            contentTypeActions: {
              delete: false,
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_PLUGIN_SETTING_ACTION', () => {
    it('should add a single plugin/setting action', () => {
      const action = {
        type: 'ON_PLUGIN_SETTING_ACTION',
        action: 'plugins::upload.assets.create',
      };
      const initialState = {
        collapsePath: ['subject1'],
        contentTypesPermissions: {
          subject1: {
            field1: {
              actions: ['create'],
            },
          },
        },
        pluginsAndSettingsPermissions: [
          {
            action: 'plugins::upload.assets.update',
            conditions: ['admin::is-creator'],
            fields: null,
            subject: null,
          },
        ],
      };
      const expected = {
        collapsePath: ['subject1'],
        contentTypesPermissions: {
          subject1: {
            field1: {
              actions: ['create'],
            },
          },
        },
        pluginsAndSettingsPermissions: [
          {
            action: 'plugins::upload.assets.update',
            conditions: ['admin::is-creator'],
            fields: null,
            subject: null,
          },
          {
            action: 'plugins::upload.assets.create',
            conditions: [],
            fields: null,
            subject: null,
          },
        ],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should remove a single plugin/setting action if already exist in the state', () => {
      const action = {
        type: 'ON_PLUGIN_SETTING_ACTION',
        action: 'plugins::upload.assets.create',
      };
      const initialState = {
        collapsePath: ['subject1'],
        contentTypesPermissions: {
          subject1: {
            field1: {
              actions: ['create'],
            },
          },
        },
        pluginsAndSettingsPermissions: [
          {
            action: 'plugins::upload.assets.update',
            conditions: ['admin::is-creator'],
            fields: null,
            subject: null,
          },
          {
            action: 'plugins::upload.assets.create',
            conditions: [],
            fields: null,
            subject: null,
          },
        ],
      };
      const expected = {
        collapsePath: ['subject1'],
        contentTypesPermissions: {
          subject1: {
            field1: {
              actions: ['create'],
            },
          },
        },
        pluginsAndSettingsPermissions: [
          {
            action: 'plugins::upload.assets.update',
            conditions: ['admin::is-creator'],
            fields: null,
            subject: null,
          },
        ],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_PLUGIN_SETTING_SUB_CATEGORY_ACTIONS', () => {
    it('should add all plugin/setting actions of a subcategory', () => {
      const action = {
        type: 'ON_PLUGIN_SETTING_SUB_CATEGORY_ACTIONS',
        actions: [
          {
            action: 'plugins::upload.assets.update',
            conditions: [],
            fields: null,
            subject: null,
          },
          {
            action: 'plugins::upload.assets.copy-link',
            conditions: [],
            fields: null,
            subject: null,
          },
          {
            action: 'plugins::upload.assets.delete',
            conditions: [],
            fields: null,
            subject: null,
          },
        ],
        shouldEnable: true,
      };
      const initialState = {
        collapsePath: ['subject1'],
        contentTypesPermissions: {
          subject1: {
            field1: {
              actions: ['create'],
            },
          },
        },
        pluginsAndSettingsPermissions: [
          {
            action: 'plugins::upload.assets.update',
            conditions: [],
            fields: null,
            subject: null,
          },
          {
            action: 'plugins::upload.assets.create',
            conditions: [],
            fields: null,
            subject: null,
          },
        ],
      };
      const expected = {
        collapsePath: ['subject1'],
        contentTypesPermissions: {
          subject1: {
            field1: {
              actions: ['create'],
            },
          },
        },
        pluginsAndSettingsPermissions: [
          {
            action: 'plugins::upload.assets.create',
            conditions: [],
            fields: null,
            subject: null,
          },
          {
            action: 'plugins::upload.assets.update',
            conditions: [],
            fields: null,
            subject: null,
          },
          {
            action: 'plugins::upload.assets.copy-link',
            conditions: [],
            fields: null,
            subject: null,
          },
          {
            action: 'plugins::upload.assets.delete',
            conditions: [],
            fields: null,
            subject: null,
          },
        ],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should remove all plugin/setting actions of a subcategory', () => {
      const action = {
        type: 'ON_PLUGIN_SETTING_SUB_CATEGORY_ACTIONS',
        actions: [
          {
            action: 'plugins::upload.assets.update',
            conditions: [],
            fields: null,
            subject: null,
          },
          {
            action: 'plugins::upload.assets.copy-link',
            conditions: [],
            fields: null,
            subject: null,
          },
          {
            action: 'plugins::upload.assets.delete',
            conditions: [],
            fields: null,
            subject: null,
          },
        ],
        shouldEnable: false,
      };
      const initialState = {
        collapsePath: ['subject1'],
        contentTypesPermissions: {
          subject1: {
            field1: {
              actions: ['create'],
            },
          },
        },
        pluginsAndSettingsPermissions: [
          {
            action: 'plugins::upload.assets.update',
            conditions: [],
            fields: null,
            subject: null,
          },
          {
            action: 'plugins::upload.assets.create',
            conditions: [],
            fields: null,
            subject: null,
          },
          {
            action: 'plugins::upload.assets.copy-link',
            conditions: [],
            fields: null,
            subject: null,
          },
          {
            action: 'plugins::upload.assets.delete',
            conditions: [],
            fields: null,
            subject: null,
          },
        ],
      };
      const expected = {
        collapsePath: ['subject1'],
        contentTypesPermissions: {
          subject1: {
            field1: {
              actions: ['create'],
            },
          },
        },
        pluginsAndSettingsPermissions: [
          {
            action: 'plugins::upload.assets.create',
            conditions: [],
            fields: null,
            subject: null,
          },
        ],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_CONTENT_TYPE_CONDITIONS_SELECT', () => {
    it('should set the content type conditions properly', () => {
      const action = {
        type: 'ON_CONTENT_TYPE_CONDITIONS_SELECT',
        subject: 'subject1',
        conditions: {
          create: ['admin::is-creator'],
          edit: [],
          update: ['admin::is-creator'],
          delete: ['admin::is-creator'],
        },
      };
      const initialState = {
        contentTypesPermissions: {
          subject1: {
            attributes: {
              attribute1: {
                actions: ['create'],
              },
            },
            contentTypeActions: {
              create: true,
            },
            conditions: {
              create: ['admin::is-creator'],
              edit: ['admin::is-creator'],
              update: ['admin::is-creator'],
              delete: ['admin::is-creator'],
            },
          },
        },
      };
      const expected = {
        contentTypesPermissions: {
          subject1: {
            attributes: {
              attribute1: {
                actions: ['create'],
              },
            },
            contentTypeActions: {
              create: true,
            },
            conditions: {
              create: ['admin::is-creator'],
              edit: [],
              update: ['admin::is-creator'],
              delete: ['admin::is-creator'],
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_PLUGIN_SETTING_CONDITIONS_SELECT', () => {
    it('should set conditions for plugin and settings permissions', () => {
      const action = {
        type: 'ON_PLUGIN_SETTING_CONDITIONS_SELECT',
        conditions: {
          action1: ['is_creator'],
        },
      };
      const initialState = {
        pluginsAndSettingsPermissions: [
          {
            action: 'action1',
            conditions: [],
            subject: null,
          },
          {
            action: 'action2',
            conditions: [],
            subject: null,
          },
          {
            action: 'action3',
            conditions: ['is_someone_else'],
            subject: null,
          },
        ],
      };
      const expected = {
        pluginsAndSettingsPermissions: [
          {
            action: 'action1',
            conditions: ['is_creator'],
            subject: null,
          },
          {
            action: 'action2',
            conditions: [],
            subject: null,
          },
          {
            action: 'action3',
            conditions: ['is_someone_else'],
            subject: null,
          },
        ],
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
