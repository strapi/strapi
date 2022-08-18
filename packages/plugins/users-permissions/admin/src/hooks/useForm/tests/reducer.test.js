import produce from 'immer';
import reducer from '../reducer';

describe('USERS PERMISSIONS | HOOKS | useForm | reducer', () => {
  let state;

  beforeEach(() => {
    state = {
      isLoading: true,
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
      state.modifiedData = true;

      const expected = produce(state, (draft) => {
        draft.isLoading = true;
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

      const expected = produce(state, (draft) => {
        draft.isLoading = false;
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

      const expected = produce(state, (draft) => {
        draft.isLoading = true;
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe('ON_SUBMIT_SUCCEEDED', () => {
    it('should set the initialData object with the modifiedData', () => {
      state.modifiedData = { test: false };

      const action = { type: 'ON_SUBMIT_SUCCEEDED', data: { test: true, foo: 'bar' } };

      const expected = produce(state, (draft) => {
        draft.modifiedData = { test: true, foo: 'bar' };
      });

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
