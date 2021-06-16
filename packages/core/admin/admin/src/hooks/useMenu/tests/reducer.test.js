import reducer, { initialState } from '../reducer';
import { SET_SECTION_LINKS } from '../constants';

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
        type: SET_SECTION_LINKS,
        data: {
          authorizedGeneralLinks: ['authorizd', 'links'],
          authorizedPluginLinks: ['authorizd', 'plugin-links'],
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
