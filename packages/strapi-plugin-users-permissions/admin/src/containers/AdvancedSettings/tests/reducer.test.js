import produce from 'immer';
import reducer from '../reducer';

describe('USERS PERMISSIONS | CONTAINERS | AdvancedSettings | reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      isLoading: true,
      isConfirmButtonLoading: false,
      initialData: {},
      modifiedData: {},
      roles: [],
    };
  });

  describe('DEFAULT_ACTION', () => {
    it('should return the state', () => {
      const expected = state;

      expect(reducer(state, {})).toEqual(expected);
    });
  });

  describe('GET_DATA', () => {
    it('should set the isLoading key to true', () => {
      const action = {
        type: 'GET_DATA',
      };

      state.isLoading = false;
      state.initialData = true;
      state.modifiedData = true;

      const expected = produce(state, draft => {
        draft.isLoading = true;
        draft.initialData = {};
        draft.modifiedData = {};
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('GET_DATA_SUCCEEDED', () => {
    it('should set the data correctly', () => {
      const data = {
        settings: { ok: true },
        roles: [
          { name: 'test1', type: 'public' },
          { name: 'test2', type: 'authenticated' },
        ],
      };
      const action = {
        type: 'GET_DATA_SUCCEEDED',
        data,
      };

      const expected = produce(state, draft => {
        draft.isLoading = false;
        draft.initialData = { ok: true };
        draft.modifiedData = { ok: true };
        draft.roles = [
          { label: 'test1', value: 'public' },
          { label: 'test2', value: 'authenticated' },
        ];
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('GET_DATA_ERROR', () => {
    it('should set the isLoading key to false', () => {
      const action = {
        type: 'GET_DATA_ERROR',
      };

      state.isLoading = false;

      const expected = produce(state, draft => {
        draft.isLoading = true;
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_CHANGE', () => {
    it('should change the data correctly', () => {
      state.modifiedData = { from: { name: 'test' }, test: 'test' };

      const action = {
        type: 'ON_CHANGE',
        keys: 'from.name',
        value: 'test@test.io',
      };

      const expected = produce(state, draft => {
        draft.modifiedData = {
          from: { name: 'test@test.io' },
          test: 'test',
        };
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_RESET', () => {
    it('should set the modifiedData object with the initialData', () => {
      state.initialData = { test: true };
      state.modifiedData = { test: false };

      const action = { type: 'ON_RESET' };

      const expected = produce(state, draft => {
        draft.modifiedData = { test: true };
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_SUBMIT', () => {
    it('should set the isConfirmButtonLoading to true', () => {
      const action = {
        type: 'ON_SUBMIT',
      };

      const expected = produce(state, draft => {
        draft.isConfirmButtonLoading = true;
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_SUBMIT_SUCCEEDED', () => {
    it('should set the initialData object with the modifiedData', () => {
      state.initialData = { test: true };
      state.modifiedData = { test: false };
      state.isConfirmButtonLoading = true;

      const action = { type: 'ON_SUBMIT_SUCCEEDED' };

      const expected = produce(state, draft => {
        draft.initialData = { test: false };
        draft.isConfirmButtonLoading = false;
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_SUBMIT_ERROR', () => {
    it('should set the initialData object with the modifiedData', () => {
      state.isConfirmButtonLoading = true;

      const action = { type: 'ON_SUBMIT_ERROR' };

      const expected = produce(state, draft => {
        draft.isConfirmButtonLoading = false;
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
