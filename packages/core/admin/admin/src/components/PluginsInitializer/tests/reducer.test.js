import reducer, { initialState } from '../reducer';

describe('ADMIN | COMPONENTS | PluginsInitializer | reducer', () => {
  let state;

  beforeEach(() => {
    state = initialState;
  });

  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      expect(reducer(state, {})).toEqual(initialState);
    });
  });

  describe('SET_PLUGIN_READY', () => {
    it('should set the isReady property to true for a plugin', () => {
      state = {
        plugins: {
          pluginA: {
            isReady: false,
          },
        },
      };

      const expected = {
        plugins: {
          pluginA: { isReady: true },
        },
      };

      const action = {
        type: 'SET_PLUGIN_READY',
        pluginId: 'pluginA',
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
