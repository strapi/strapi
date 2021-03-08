import produce from 'immer';
import reducer from '../reducer';

describe('USERS PERMISSIONS | HOOKS | useForm | reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      formErrors: {},
      isLoading: true,
      initialData: {},
      modifiedData: {},
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
        email: { enabled: true, icon: 'envelope' },
        discord: {
          callback: '/auth/discord/callback',
          enabled: false,
          icon: 'discord',
          key: '',
          scope: ['identify', 'email'],
          secret: '',
        },
      };
      const action = {
        type: 'GET_DATA_SUCCEEDED',
        data,
      };

      const expected = produce(state, draft => {
        draft.isLoading = false;
        draft.initialData = data;
        draft.modifiedData = data;
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

  describe('ON_SUBMIT_SUCCEEDED', () => {
    it('should set the initialData object with the modifiedData', () => {
      state.initialData = { test: true };
      state.modifiedData = { test: false };
      state.formErrors = { ok: true };

      const action = { type: 'ON_SUBMIT_SUCCEEDED' };

      const expected = produce(state, draft => {
        draft.initialData = { test: false };
        draft.formErrors = {};
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('RESET_FORM', () => {
    it('should set the modifiedData object with the initialData', () => {
      state.initialData = { test: true };
      state.modifiedData = { test: false };
      state.formErrors = { ok: true };

      const action = { type: 'RESET_FORM' };

      const expected = produce(state, draft => {
        draft.modifiedData = { test: true };
        draft.formErrors = {};
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('SET_ERRORS', () => {
    it('should set the formErrors correctly', () => {
      const action = { type: 'SET_ERRORS', errors: { test: true } };

      const expected = produce(state, draft => {
        draft.formErrors = { test: true };
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
