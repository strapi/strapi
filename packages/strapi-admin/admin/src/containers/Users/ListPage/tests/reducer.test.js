import { reducer } from '../reducer';

describe('ADMIN | CONTAINERS | USERS | ListPage | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const initialState = {
        test: true,
      };

      expect(reducer(initialState, {})).toEqual(initialState);
    });
  });

  describe('GET_DATA', () => {
    it('should return the initialState', () => {
      const initialState = {
        test: true,
      };

      const action = {
        type: 'GET_DATA',
      };

      const expected = {
        data: [],
        dataToDelete: [],
        isLoading: true,
        pagination: {
          page: 1,
          pageSize: 10,
          pageCount: 0,
          total: 0,
        },
        showModalConfirmButtonLoading: false,
        shouldRefetchData: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('GET_DATA_SUCCEEDED', () => {
    it('Should set the data correctly', () => {
      const action = {
        type: 'GET_DATA_SUCCEEDED',
        data: [1, 2, 3],
        pagination: {
          page: 1,
          pageSize: 10,
          pageCount: 5,
          total: 20,
        },
      };
      const initialState = {
        data: [],
        dataToDelete: [],
        isLoading: true,
        pagination: {},
      };
      const expected = {
        data: [1, 2, 3],
        dataToDelete: [],
        isLoading: false,
        pagination: {
          page: 1,
          pageSize: 10,
          pageCount: 5,
          total: 20,
        },
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE_DATA_TO_DELETE', () => {
    it('should change the data correctly', () => {
      const initialState = {
        data: [],
        dataToDelete: [],
        isLoading: true,
      };
      const action = {
        type: 'ON_CHANGE_DATA_TO_DELETE',
        dataToDelete: [1, 2],
      };
      const expected = {
        data: [],
        dataToDelete: [1, 2],
        isLoading: true,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_DELETE_USERS', () => {
    it('should set the showModalConfirmButtonLoading to true', () => {
      const initialState = {
        data: [1],
        dataToDelete: [1],
        showModalConfirmButtonLoading: false,
      };
      const action = {
        type: 'ON_DELETE_USERS',
      };
      const expected = {
        data: [1],
        dataToDelete: [1],
        showModalConfirmButtonLoading: true,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('ON_DELETE_USERS_SUCCEEDED', () => {
    it('should set the shouldRefetchData to true', () => {
      const initialState = {
        data: [1],
        dataToDelete: [1],
        showModalConfirmButtonLoading: true,
        shouldRefetchData: false,
      };
      const action = {
        type: 'ON_DELETE_USERS_SUCCEEDED',
      };
      const expected = {
        data: [1],
        dataToDelete: [1],
        showModalConfirmButtonLoading: true,
        shouldRefetchData: true,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('RESET_DATA_TO_DELETE', () => {
    it('should empty the dataToDelete array', () => {
      const initialState = {
        data: [1],
        dataToDelete: [1],
        showModalConfirmButtonLoading: true,
        shouldRefetchData: true,
      };
      const action = {
        type: 'RESET_DATA_TO_DELETE',
      };
      const expected = {
        data: [1],
        dataToDelete: [],
        showModalConfirmButtonLoading: false,
        shouldRefetchData: false,
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });

  describe('UNSET_IS_LOADING', () => {
    it('should set the isLoading to false', () => {
      const action = {
        type: 'UNSET_IS_LOADING',
      };
      const initialState = {
        data: [],
        dataToDelete: [],
        isLoading: true,
        pagination: {},
      };
      const expected = {
        data: [],
        dataToDelete: [],
        isLoading: false,
        pagination: {},
      };

      expect(reducer(initialState, action)).toEqual(expected);
    });
  });
});
