import reducer from '../reducer';
import { SHOW_MODAL, HIDE_MODAL, RESOLVE_LOCALE_EDITION, EDIT_LOCALE } from '../constants';

describe(`I18N Settings edit reducer`, () => {
  describe(`Initial state`, () => {
    it('returns the initialState', () => {
      const state = {
        localeToEdit: null,
        isEditModalOpen: false,
        isEditing: false,
      };

      expect(reducer(state, {})).toEqual(state);
    });
  });

  describe(SHOW_MODAL, () => {
    it('set the isEditModalOpen key to true', () => {
      const state = {
        localeToEdit: null,
        isEditModalOpen: false,
        isEditing: false,
      };

      const action = {
        type: SHOW_MODAL,
        localeToEdit: 'en-EN',
      };

      const expected = {
        localeToEdit: 'en-EN',
        isEditModalOpen: true,
        isEditing: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe(HIDE_MODAL, () => {
    it('sets the isEditModalOpen value to false when it was true', () => {
      const state = {
        localeToEdit: 'en-EN',
        isEditModalOpen: true,
        isEditing: false,
      };

      const action = {
        type: HIDE_MODAL,
      };

      const expected = {
        localeToEdit: null,
        isEditModalOpen: false,
        isEditing: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe(EDIT_LOCALE, () => {
    it('sets the isEditing value to true', () => {
      const state = {
        localeToEdit: 'en-EN',
        isEditModalOpen: true,
        isEditing: false,
      };

      const action = {
        type: EDIT_LOCALE,
      };

      const expected = {
        localeToEdit: 'en-EN',
        isEditModalOpen: true,
        isEditing: true,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });

  describe(RESOLVE_LOCALE_EDITION, () => {
    it('resets the state to its initial values when they were true', () => {
      const state = {
        localeToEdit: 'en-EN',
        isEditModalOpen: true,
        isEditing: true,
      };

      const action = {
        type: RESOLVE_LOCALE_EDITION,
      };

      const expected = {
        localeToEdit: null,
        isEditModalOpen: false,
        isEditing: false,
      };

      expect(reducer(state, action)).toEqual(expected);
    });
  });
});
