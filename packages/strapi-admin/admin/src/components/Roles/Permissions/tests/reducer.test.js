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
        permissions: {},
      };
      const expected = {
        collapsePath: [],
        permissions: {
          place: {
            contentTypeActions: {},
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
          like: {
            contentTypeActions: {},
            number: {
              actions: ['create'],
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should remove permissions correctly', () => {
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
        permissions: {
          place: {
            'address.city': {
              actions: ['create', 'read'],
            },
            'address.street': {
              actions: ['create', 'read'],
            },
            picture: {
              actions: ['create'],
            },
          },
          like: {
            contentTypeActions: {
              delete: true,
            },
            number: {
              actions: ['create'],
            },
          },
        },
      };
      const expected = {
        collapsePath: [],
        permissions: {
          place: {
            contentTypeActions: {},
            'address.city': {
              actions: ['read'],
            },
            'address.street': {
              actions: ['read'],
            },
            picture: {
              actions: [],
            },
          },
          like: {
            contentTypeActions: {
              delete: true,
            },
            number: {
              actions: [],
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
        attribute: 'picture',
      };
      const initialState = {
        collapsePath: [],
        permissions: {},
      };
      const expected = {
        collapsePath: [],
        permissions: {
          place: {
            picture: {
              actions: staticAttributeActions,
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should remove all actions if they are already in permissions', () => {
      const action = {
        type: 'ALL_ATTRIBUTE_ACTIONS_SELECT',
        subject: 'place',
        attribute: 'picture',
      };
      const initialState = {
        collapsePath: [],
        permissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            picture: {
              actions: staticAttributeActions,
            },
            name: {
              actions: ['create'],
            },
          },
        },
      };
      const expected = {
        collapsePath: [],
        permissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            picture: {
              actions: [],
            },
            name: {
              actions: ['create'],
            },
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
        attribute: 'picture',
        action: 'create',
      };
      const initialState = {
        collapsePath: [],
        permissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            picture: {
              actions: ['read'],
            },
          },
        },
      };
      const expected = {
        collapsePath: [],
        permissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            picture: {
              actions: ['read', 'create'],
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
        permissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            picture: {
              actions: ['read'],
            },
          },
          country: {
            contentTypeActions: {
              delete: true,
            },
            flag: {
              actions: ['read', 'update'],
            },
            description: {
              actions: ['read', 'create'],
            },
          },
        },
      };
      const expected = {
        collapsePath: [],
        permissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            picture: {
              actions: [],
            },
          },
          country: {
            contentTypeActions: {
              delete: true,
            },
            flag: {
              actions: ['read', 'update'],
            },
            description: {
              actions: ['read', 'create'],
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('CONTENT_TYPE_ATTRIBUTES_ACTION_SELECT', () => {
    it('should set attributes permission action', () => {
      const action = {
        type: 'CONTENT_TYPE_ATTRIBUTES_ACTION_SELECT',
        subject: 'place',
        action: 'create',
        attributes: [
          { attributeName: 'address', required: true },
          { attributeName: 'city', required: false },
          { attributeName: 'postal_code', required: true },
        ],
        shouldEnable: true,
      };
      const initialState = {
        collapsePath: [],
        permissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            picture: {
              actions: ['read'],
            },
          },
        },
      };
      const expected = {
        collapsePath: [],
        permissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            address: {
              actions: ['create'],
            },
            city: {
              actions: ['create'],
            },
            picture: {
              actions: ['read'],
            },
            postal_code: {
              actions: ['create'],
            },
          },
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should remove attributes permissions except the required attributes', () => {
      const action = {
        type: 'CONTENT_TYPE_ATTRIBUTES_ACTION_SELECT',
        subject: 'place',
        action: 'create',
        attributes: [
          { attributeName: 'address', required: true },
          { attributeName: 'city', required: false },
          { attributeName: 'postal_code', required: true },
        ],
        shouldEnable: false,
      };
      const initialState = {
        collapsePath: [],
        permissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            postal_code: {
              actions: ['create'],
            },
            picture: {
              actions: ['read'],
            },
          },
        },
      };
      const expected = {
        collapsePath: [],
        permissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            city: {
              actions: [],
            },
            postal_code: {
              actions: ['create'],
            },
            picture: {
              actions: ['read'],
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
        permissions: {
          place: {
            postal_code: {
              actions: ['create'],
            },
            picture: {
              actions: ['read'],
            },
          },
        },
      };
      const expected = {
        collapsePath: [],
        permissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            postal_code: {
              actions: ['create'],
            },
            picture: {
              actions: ['read'],
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
        permissions: {
          place: {
            contentTypeActions: {
              delete: true,
            },
            postal_code: {
              actions: ['create'],
            },
            picture: {
              actions: ['read'],
            },
          },
        },
      };
      const expected = {
        collapsePath: [],
        permissions: {
          place: {
            contentTypeActions: {
              delete: false,
            },
            postal_code: {
              actions: ['create'],
            },
            picture: {
              actions: ['read'],
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
        addContentTypeActions: false,
      };

      const initialState = {
        permissions: {
          place: {
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
      };

      const expected = {
        permissions: {
          place: {
            contentTypeActions: {},
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
        addContentTypeActions: true,
      };

      const initialState = {
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.create' },
              { action: 'plugins::content-manager.explorer.read' },
              { action: 'plugins::content-manager.explorer.update' },
              { action: 'plugins::content-manager.explorer.delete' },
            ],
          },
        },
        permissions: {
          place: {
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
      };

      const expected = {
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.create' },
              { action: 'plugins::content-manager.explorer.read' },
              { action: 'plugins::content-manager.explorer.update' },
              { action: 'plugins::content-manager.explorer.delete' },
            ],
          },
        },
        permissions: {
          place: {
            contentTypeActions: {
              'plugins::content-manager.explorer.create': true,
              'plugins::content-manager.explorer.delete': true,
              'plugins::content-manager.explorer.read': true,
              'plugins::content-manager.explorer.update': true,
            },
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
        addContentTypeActions: true,
      };

      const initialState = {
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.create' },
              { action: 'plugins::content-manager.explorer.read' },
              { action: 'plugins::content-manager.explorer.update' },
              { action: 'plugins::content-manager.explorer.delete' },
            ],
          },
        },
        permissions: {
          place: {
            contentTypeActions: {
              'plugins::content-manager.explorer.delete': true,
              'plugins::content-manager.explorer.read': true,
              'plugins::content-manager.explorer.create': true,
              'plugins::content-manager.explorer.update': true,
            },
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
      };

      const expected = {
        permissionsLayout: {
          sections: {
            contentTypes: [
              { action: 'plugins::content-manager.explorer.create' },
              { action: 'plugins::content-manager.explorer.read' },
              { action: 'plugins::content-manager.explorer.update' },
              { action: 'plugins::content-manager.explorer.delete' },
            ],
          },
        },
        permissions: {
          place: {
            contentTypeActions: {
              'plugins::content-manager.explorer.delete': false,
              'plugins::content-manager.explorer.read': false,
              'plugins::content-manager.explorer.update': false,
              'plugins::content-manager.explorer.create': false,
            },
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
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
