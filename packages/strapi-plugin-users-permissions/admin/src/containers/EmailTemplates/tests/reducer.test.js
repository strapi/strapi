import produce from 'immer';
import reducer from '../reducer';

describe('USERS PERMISSIONS | CONTAINERS | EmailTemplates | reducer', () => {
  let state;

  beforeEach(() => {
    state = {
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
});
