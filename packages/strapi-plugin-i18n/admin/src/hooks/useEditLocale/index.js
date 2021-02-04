import { useReducer } from 'react';
import { getTrad } from '../../utils';
import reducer, { initialState } from './reducer';
import { SHOW_MODAL, HIDE_MODAL, RESOLVE_LOCALE_EDITION, EDIT_LOCALE } from './constants';

const useEditLocale = () => {
  const [{ isEditModalOpen, isEditing, localeToEdit }, dispatch] = useReducer(
    reducer,
    initialState
  );

  const editLocale = () => {
    dispatch({ type: EDIT_LOCALE });

    return new Promise(resolve =>
      setTimeout(() => {
        dispatch({ type: RESOLVE_LOCALE_EDITION });

        strapi.notification.toggle({
          type: 'success',
          message: { id: getTrad('Settings.locales.modal.edit.success') },
        });

        resolve();
      }, 1000)
    );
  };

  const showEditModal = localeToEdit => dispatch({ type: SHOW_MODAL, localeToEdit });
  const hideEditModal = () => dispatch({ type: HIDE_MODAL });

  return { isEditing, isEditModalOpen, localeToEdit, editLocale, showEditModal, hideEditModal };
};

export default useEditLocale;
