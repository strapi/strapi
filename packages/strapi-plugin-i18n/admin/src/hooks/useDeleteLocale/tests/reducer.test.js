import reducer from '../reducer';
import { SHOW_MODAL, HIDE_MODAL, RESOLVE_LOCALE, DELETE_LOCALE } from '../constants';

describe(`I18N Settings page reducer`, () => {
  describe(`Initial state`, () => {
    it('returns the initialState', () => {
      const state = {
        localeToDelete: null,
        isDeleteModalOpen: false,
        isDeleting: false,
      };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe(SHOW_MODAL, () => {
    it('set the isDeleteModalOpen key to true', () => {
      const state = {
        localeToDelete: null,
        isDeleteModalOpen: false,
        isDeleting: false,
      };

      const action = {
        type: SHOW_MODAL,
        localeToDelete: 'en-EN',
      };

      const expected = {
        localeToDelete: 'en-EN',
        isDeleteModalOpen: true,
        isDeleting: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe(HIDE_MODAL, () => {
    it('sets the isDeleteModalOpen value to false when it was true', () => {
      const state = {
        localeToDelete: 'en-EN',
        isDeleteModalOpen: true,
        isDeleting: false,
      };

      const action = {
        type: HIDE_MODAL,
      };

      const expected = {
        localeToDelete: null,
        isDeleteModalOpen: false,
        isDeleting: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe(DELETE_LOCALE, () => {
    it('sets the isDeleting value to true', () => {
      const state = {
        localeToDelete: 'en-EN',
        isDeleteModalOpen: true,
        isDeleting: false,
      };

      const action = {
        type: DELETE_LOCALE,
      };

      const expected = {
        localeToDelete: 'en-EN',
        isDeleteModalOpen: true,
        isDeleting: true,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe(RESOLVE_LOCALE, () => {
    it('resets the state to its initial values when they were true', () => {
      const state = {
        localeToDelete: 'en-EN',
        isDeleteModalOpen: true,
        isDeleting: true,
      };

      const action = {
        type: RESOLVE_LOCALE,
      };

      const expected = {
        localeToDelete: null,
        isDeleteModalOpen: false,
        isDeleting: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
