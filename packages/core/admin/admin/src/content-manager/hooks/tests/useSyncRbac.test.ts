import { SyncRbacState, reducer } from '../useSyncRbac';

describe('CONTENT MANAGER | CONTAINERS | RBACMANAGER | reducer', () => {
  let state: SyncRbacState;

  beforeEach(() => {
    state = {
      permissions: null,
    };
  });

  describe('SET_PERMISSIONS', () => {
    it('should set the permissions to an empty array when the permissions are empty', () => {
      const expected = {
        permissions: [],
      };

      expect(
        reducer(state, {
          type: 'ContentManager/RBACManager/SET_PERMISSIONS',
          permissions: {},
        })
      ).toEqual(expected);
    });

    it('should set the permissions correctly when the permissions are not empty', () => {
      const permissions = {
        create: [
          {
            action: 'create',
            subject: 'article',
          },
          {
            action: 'create',
            subject: 'article',
          },
        ],
        read: [
          {
            action: 'read',
            subject: 'article',
          },
          {
            action: 'read',
            subject: 'article',
          },
        ],
      };
      const expected = {
        permissions: [
          {
            action: 'create',
            subject: 'article',
          },
          {
            action: 'create',
            subject: 'article',
          },
          {
            action: 'read',
            subject: 'article',
          },
          {
            action: 'read',
            subject: 'article',
          },
        ],
      };

      expect(
        reducer(state, {
          type: 'ContentManager/RBACManager/SET_PERMISSIONS',
          permissions,
        })
      ).toEqual(expected);
    });
  });

  describe('RESET_PERMISSIONS', () => {
    it('should set the permissions to null', () => {
      state.permissions = [];

      expect(
        reducer(state, {
          type: 'ContentManager/RBACManager/RESET_PERMISSIONS',
        })
      ).toEqual({ permissions: null });
    });
  });
});
