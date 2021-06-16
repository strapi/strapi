import reducer, { initialState } from '../reducer';

describe('ADMIN | LeftMenu | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const state = {
        test: true,
      };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('SET_SECTION_LINKS', () => {
    it('sets the generalSectionLinks and the pluginsSectionLinks with the action', () => {
      const state = { ...initialState };
      const action = {
        type: 'SET_SECTION_LINKS',
        data: {
          authorizedGeneralSectionLinks: ['authorizd', 'links'],
          authorizedPluginSectionLinks: ['authorizd', 'plugin-links'],
        },
      };

      const expected = {
        ...initialState,
        generalSectionLinks: ['authorizd', 'links'],
        pluginsSectionLinks: ['authorizd', 'plugin-links'],
      };
      const actual = reducer(state, action);

      expect(actual).toEqual(expected);
    });
  });
});
