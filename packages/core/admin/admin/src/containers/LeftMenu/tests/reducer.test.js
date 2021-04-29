import reducer, { initialState } from '../reducer';
import { SET_CT_OR_ST_LINKS, SET_SECTION_LINKS, TOGGLE_IS_LOADING } from '../constants';

describe('ADMIN | LeftMenu | reducer', () => {
  describe('DEFAULT_ACTION', () => {
    it('should return the initialState', () => {
      const state = {
        test: true,
      };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe('TOGGLE_IS_LOADING', () => {
    it('should change the isLoading property correctly', () => {
      const state = {
        isLoading: true,
      };

      const expected = {
        isLoading: false,
      };

      const action = {
        type: TOGGLE_IS_LOADING,
      };

      expect(reducer(state, action)).toEqual(expected);
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

  describe('SET_CT_OR_ST_LINKS', () => {
    it('sets the generalSectionLinks and the pluginsSectionLinks with the action', () => {
      const state = { ...initialState };
      const action = {
        type: SET_CT_OR_ST_LINKS,
        data: {
          authorizedCtLinks: ['authorizd', 'ct-links'],
          authorizedStLinks: ['authorizd', 'st-links'],
        },
      };

      const expected = {
        ...initialState,
        collectionTypesSectionLinks: ['authorizd', 'ct-links'],
        singleTypesSectionLinks: ['authorizd', 'st-links'],
      };

      const actual = reducer(state, action);

      expect(actual).toEqual(expected);
    });
  });
});
