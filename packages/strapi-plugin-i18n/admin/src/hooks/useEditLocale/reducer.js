/* eslint-disable consistent-return */
import produce from 'immer';
import { SHOW_MODAL, HIDE_MODAL, RESOLVE_LOCALE_EDITION, EDIT_LOCALE } from './constants';

export const initialState = {
  localeToEdit: null,
  isEditModalOpen: false,
  isEditing: false,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case SHOW_MODAL: {
        draftState.isEditModalOpen = true;
        draftState.localeToEdit = action.localeToEdit;
        break;
      }
      case HIDE_MODAL: {
        draftState.isEditModalOpen = false;
        draftState.localeToEdit = null;
        break;
      }
      case EDIT_LOCALE: {
        draftState.isEditing = true;
        break;
      }

      case RESOLVE_LOCALE_EDITION: {
        draftState.isEditing = false;
        draftState.isEditModalOpen = false;
        draftState.localeToEdit = null;
        break;
      }

      default:
        return draftState;
    }
  });

export default reducer;
