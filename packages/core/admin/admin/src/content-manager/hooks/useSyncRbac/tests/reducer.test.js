import { resetPermissions, setPermissions } from '../actions';
import reducer, { initialState } from '../reducer';

describe('CONTENT MANAGER | CONTAINERS | RBACMANAGER | reducer', () => {
  let state;

  beforeEach(() => {
    state = initialState;
  });

  describe('SET_PERMISSIONS', () => {
    it('should set the permissions to an empty array when the permissions are empty', () => {
      const expected = {
        permissions: [],
      };

      expect(reducer(state, setPermissions({}))).toEqual(expected);
    });

    it('should set the permissions correctly when the permissions are not empty', () => {
      const permissions = {
        create: [
          {
            action: 'create',
            subject: 'article',
            properties: 'test',
          },
          {
            action: 'create',
            subject: 'article',
            properties: 'test1',
          },
        ],
        read: [
          {
            action: 'read',
            subject: 'article',
            properties: 'test',
          },
          {
            action: 'read',
            subject: 'article',
            properties: 'test1',
          },
        ],
      };
      const expected = {
        permissions: [
          {
            action: 'create',
            subject: 'article',
            properties: 'test',
          },
          {
            action: 'create',
            subject: 'article',
            properties: 'test1',
          },
          {
            action: 'read',
            subject: 'article',
            properties: 'test',
          },
          {
            action: 'read',
            subject: 'article',
            properties: 'test1',
          },
        ],
      };

      expect(reducer(state, setPermissions(permissions))).toEqual(expected);
    });
  });

  describe('RESET_PERMISSIONS', () => {
    it('should set the permissions to null', () => {
      state.permissions = [];

      expect(reducer(state, resetPermissions())).toEqual({ permissions: null });
    });
  });
});
