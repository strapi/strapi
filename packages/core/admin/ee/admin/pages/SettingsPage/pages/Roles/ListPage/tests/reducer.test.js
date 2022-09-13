import reducer from '../reducer';

describe('ADMIN | ee | CONTAINERS | ROLES | ListPage | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const state = {
        test: true,
      };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('ON_REMOVE_ROLES', () => {
    it('should set the showModalConfirmButtonLoading to true', () => {
      const action = {
        type: 'ON_REMOVE_ROLES',
      };
      const initialState = {
        roleToDelete: 1,
        shouldRefetchData: false,
        showModalConfirmButtonLoading: false,
      };
      const expected = {
        roleToDelete: 1,
        shouldRefetchData: false,
        showModalConfirmButtonLoading: true,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_REMOVE_ROLES_SUCCEEDED', () => {
    it('should set the shouldRefetchData to true', () => {
      const action = {
        type: 'ON_REMOVE_ROLES_SUCCEEDED',
      };
      const initialState = {
        roleToDelete: 1,
        shouldRefetchData: false,
        showModalConfirmButtonLoading: true,
      };
      const expected = {
        roleToDelete: null,
        shouldRefetchData: true,
        showModalConfirmButtonLoading: true,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('SET_ROLE_TO_DELETE', () => {
    it('should set the selected roles property correctly', () => {
      const action = {
        type: 'SET_ROLE_TO_DELETE',
        id: 6,
      };
      const initialState = {
        roleToDelete: null,
        shouldRefetchData: false,
      };
      const expected = {
        roleToDelete: 6,
        shouldRefetchData: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
