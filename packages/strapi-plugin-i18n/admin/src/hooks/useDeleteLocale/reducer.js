/* eslint-disable consistent-return */
import produce from 'immer';
import { SHOW_MODAL, HIDE_MODAL, RESOLVE_LOCALE, DELETE_LOCALE } from './constants';

export const initialState = {
  localeToDelete: null,
  isDeleteModalOpen: false,
  isDeleting: false,
};

const reducer = (state, action) =>
  produce(state, draftState => {
    switch (action.type) {
      case SHOW_MODAL: {
        draftState.isDeleteModalOpen = true;
        draftState.localeToDelete = action.localeToDelete;
        break;
      }
      case HIDE_MODAL: {
        draftState.isDeleteModalOpen = false;
        draftState.localeToDelete = null;
        break;
      }
      case DELETE_LOCALE: {
        draftState.isDeleting = true;
        break;
      }

      case RESOLVE_LOCALE: {
        draftState.isDeleting = false;
        draftState.isDeleteModalOpen = false;
        draftState.localeToDelete = null;
        break;
      }

      default:
        return draftState;
    }
  });

export default reducer;
