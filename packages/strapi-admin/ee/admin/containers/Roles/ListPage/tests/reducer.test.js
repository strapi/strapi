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

  describe('ON_SELECTION', () => {
    it('should add the selected role correctly', () => {
      const action = {
        type: 'ON_SELECTION',
        id: 2,
      };
      const initialState = {
        selectedRoles: [],
        shouldRefetchData: false,
      };
      const expected = {
        selectedRoles: [2],
        shouldRefetchData: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });

    it('should remove the selected role correctly', () => {
      const action = {
        type: 'ON_SELECTION',
        id: 2,
      };
      const initialState = {
        selectedRoles: [1, 2],
        shouldRefetchData: false,
      };
      const expected = {
        selectedRoles: [1],
        shouldRefetchData: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_REMOVE_ROLES', () => {
    it('should set the showModalConfirmButtonLoading to true', () => {
      const action = {
        type: 'ON_REMOVE_ROLES',
      };
      const initialState = {
        selectedRoles: [],
        shouldRefetchData: false,
        showModalConfirmButtonLoading: false,
      };
      const expected = {
        selectedRoles: [],
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
        selectedRoles: [],
        shouldRefetchData: false,
        showModalConfirmButtonLoading: true,
      };
      const expected = {
        selectedRoles: [],
        shouldRefetchData: true,
        showModalConfirmButtonLoading: true,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('RESET_DATA_TO_DELETE', () => {
    it('should empty the selected role array and set the shouldRefetchData to false', () => {
      const action = {
        type: 'RESET_DATA_TO_DELETE',
      };
      const initialState = {
        selectedRoles: [1, 2, 4],
        shouldRefetchData: true,
        showModalConfirmButtonLoading: true,
      };
      const expected = {
        selectedRoles: [],
        shouldRefetchData: false,
        showModalConfirmButtonLoading: false,
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
        selectedRoles: [1, 2, 4],
        shouldRefetchData: false,
      };
      const expected = {
        selectedRoles: [6],
        shouldRefetchData: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
